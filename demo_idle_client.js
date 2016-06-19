#!./node
var WebSocketClient = require('./websocket').client;

var args = process.argv.slice(2);

var host = '127.0.0.1';
var host_header = 'websocket.estest.akamai.com';
var fwd_host = '127.0.0.10';
var fwd_port = 8080;
var path = '/index.html';
var instances = 1;
var secure = false;
var verbose = false;
var read_timeout = '300';

var i=0;

while (i < args.length)
{
  switch (args[i])
  {
    case '-host':         host = args[++i];         i++; break;
    case '-host-header':  host_header = args[++i];  i++; break;
    case '-fwd-host':     fwd_host = args[++i];     i++; break;
    case '-fwd-port':     fwd_port = args[++i];     i++; break;
    case '-path':         path = args[++i];         i++; break;
    case '-instances':    instances = args[++i];    i++; break;
    case '-read-timeout': read_timeout = args[++i]; i++; break;
    case '-secure':       secure = true;            i++; break;
    case '-verbose':      verbose = true;           i++; break;
    default:
      console.log('Usage:');
      console.log('demo_client.js -host 127.0.0.1 -host-header websocket.estest.akamai.com -fwd-host 127.0.0.10 -fwd-port 8080 -path /index.html -instances 1 -read-timeout 300 -secure -verbose');
      return;
  }
}

console.log('demo_client: host ' + host + ', host-header ' + host_header + ', fwd-host ' + fwd_host + ', fwd-port ' + fwd_port + ', path ' + path + ', instances ' + instances + ', read-timeout ' + read_timeout + ', secure ' + secure + ', verbose ' + verbose);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var conns = instances;
var exit_code = 0;

for (i=0; i < instances; i++)
{
  var client = new WebSocketClient();

  client.on('connectFailed', function(error) {
    console.log('demo_client: Connect Error: ' + error.toString());
    conns--;
    if (conns == 0)
      process.exit(1);
  });

  client.on('connect', function(connection) {
    console.log('demo_client: WebSocket client connected');
      
    connection.on('error', function(error) {
      console.log("demo_client: Connection Error: " + error.toString());
      conns--;
//      exit_code = 1;
      if (conns == 0)
        process.exit(1);
    });

    connection.on('close', function() {
      console.log('demo_client: echo-protocol Connection Closed');
      conns--;
      if (conns == 0)
        process.exit(exit_code);
    });

    connection.on('message', function(message) {
      if (message.type === 'utf8' && verbose) {
        console.log("demo_client: Received: '" + message.utf8Data + "'");
      }
    });
  });

  var ReqHeaders = {
    'Host': host_header,
  };

  var uri = '';
  if (secure)
    uri += 'wss://';
  else
    uri += 'ws://';
  uri += host;
  uri += path;
  uri += '?host=';
  uri += fwd_host;
  uri += '&port=';
  uri += fwd_port;
  uri += '&timeout=';
  uri += read_timeout;
  uri += 's';

  if (verbose)
    console.log('demo_client: Connect(' + i + '): ' + uri);

  client.connect(uri, 'echo-protocol', ReqHeaders);
}
