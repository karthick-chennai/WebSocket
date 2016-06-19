#!./node
var WebSocketServer = require('./websocket').server;

var args = process.argv.slice(2);

var host = '127.0.0.10';
var port = 8080;
var msg_size = 10;
var delay = 1000;
var runtime = 300;
var secure = false;
var verbose = false;

var i=0;

while (i < args.length)
{
  switch (args[i])
  {
    case '-host':        host = args[++i];        i++; break;
    case '-port':        port = args[++i];        i++; break;
    case '-msg-size':    msg_size = args[++i];    i++; break;
    case '-delay':       delay = args[++i];       i++; break;
    case '-runtime':     runtime = args[++i];     i++; break;
    case '-secure':      secure = true;           i++; break;
    case '-verbose':     verbose = true;          i++; break;
    default:
      console.log('Usage:');
      console.log('demo_server.js -host 127.0.0.10 -port 8080 -msg-size 10 -delay 1000 -runtime 300 -secure -verbose');
      return;
  }
}

var msg_string = '0';
var msgsize = 0;
while (msg_string.length < msg_size)
{
  msg_string += '0';
  msgsize = msgsize + 1;
}

console.log('demo_server: host ' + host + ', port ' + port + ', msg-size ' + msg_size + ', delay ' + delay + ', runtime ' + runtime + ', secure ' + secure + ', verbose ' + verbose);

var protocol;
var server;

if (secure)
{
  protocol = require('https');
  var fs = require('fs');
   var options = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem')
  };

  server = protocol.createServer(options, function(request, response) {
    console.log('demo_server: ' + (new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
  });
}
else
{
  protocol = require('http');
  server = protocol.createServer(function(request, response) {
      console.log('demo_server: ' + (new Date()) + ' Received request for ' + request.url);
      response.writeHead(404);
      response.end();
  });
}

server.listen(port, host, function() {
    console.log('demo_server: ' + (new Date()) + (secure ? ' Secure' : '') + ' Server is listening on port ' + host + ':' + port);
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log('demo_server: ' + (new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log('demo_server: ' + (new Date()) + ' Connection accepted.');

    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            if (verbose)
              console.log('demo_server: ' + 'Received Message: ' + message.utf8Data);
            
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            if (verbose)
              console.log('demo_server: ' + 'Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log('demo_server: ' + (new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });

    function sendBeat() {
        if (connection.connected && msgsize > 0) {
            connection.sendUTF(new Date() + ':' + msg_string);
            msgsize = msgsize - 1;
            setTimeout(sendBeat, delay);
        }
    }
    sendBeat();
});


setTimeout(function(){
  console.log('demo_server: ' + new Date() + ' Shutdown...');
  wsServer.shutDown();
  process.exit();
}, runtime * 1000);      
