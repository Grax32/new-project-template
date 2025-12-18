import http from 'http';
import { Socket } from 'net';
import { AnsiUp } from 'ansi_up';
import config from './services/config';

// This will be sent if preparation completes successfully
const expectedSuccessMessage = 'Preparation complete.';
const expectedSuccessMessageWillNotHave = "echo";

const ansi_up = new AnsiUp();
let sseClients: http.ServerResponse[] = [];
const chunks: Buffer[] = [];
let successReceived = false;
// Track raw sockets so we can forcibly destroy them if server.close() hangs
const connections = new Set<Socket>();

// Create HTTP server
const server = http.createServer((req, res) => {
    // SSE endpoint
    if (req.url === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });

        // send a heartbeat to establish the stream
        res.write('\n');

        // replay previous chunks
        for (const chunk of chunks) {
            const html = ansi_up.ansi_to_html(chunk.toString());
            res.write(`data: ${JSON.stringify(html)}\n\n`);
        }

        sseClients.push(res);

        req.on('close', () => {
            sseClients = sseClients.filter(c => c !== res);
        });

        return;
    }

    // Serve the HTML page which connects to the SSE stream
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });

    res.end(`
    <html>
      <head>
        <style>
          body { background:black; color:white; margin:10px; padding:4px; font-family:monospace; }
          pre { margin:4px; white-space:pre-wrap; word-wrap:break-word; }
        </style>
      </head>
      <body>
        <pre id="terminal"></pre>
        <script>
          let completedSuccessfully = false;
          const terminal = document.getElementById('terminal');
          const es = new EventSource('/events');
          es.onmessage = (e) => {
            try {
              const html = JSON.parse(e.data);

              if (html.trim() === 'Preparation complete.') {
                completedSuccessfully = true;
                terminal.innerHTML += '<div style="color:green;">Preparation completed successfully.</div>';
                setTimeout(() => { location.reload(); }, 5000);
              } else {
                terminal.innerHTML += html;
              }
              window.scrollTo(0, document.body.scrollHeight);
            } catch (err) {
              console.error('Failed to parse event data', err);
            }
          };
          es.onerror = () => {
            es.close();
            if (completedSuccessfully) return;
            terminal.innerHTML += '<div style="color:red;">Disconnected.</div>';
            console.error('Connection to server lost.  No reconnect will be attempted.');            
          };
        </script>
      </body>
    </html>
  `);
});

server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
});

// track sockets so we can force-close them if needed
server.on('connection', (socket: import('net').Socket) => {
  connections.add(socket);
  socket.on('close', () => connections.delete(socket));
});

// Stream stdin to all SSE clients and store it for replay
process.stdin.on('data', chunk => {
    // show in console
    const chunkString = chunk.toString('utf-8');
    console.log(chunkString);

    // capture for replay if a client joins late
    chunks.push(Buffer.from(chunk));

    // send to all SSE clients
    const html = ansi_up.ansi_to_html(chunkString);
    const payload = `data: ${JSON.stringify(html)}\n\n`;
    sseClients.forEach(res => res.write(payload));

    // Track expected success message as data arrives to avoid edge cases
    const containsSuccessMessage = chunkString.includes(expectedSuccessMessage) && 
        !chunkString.includes(expectedSuccessMessageWillNotHave);

    successReceived ||= containsSuccessMessage;
});

// Close server and clients when stdin ends
process.stdin.on('end', () => {
    console.log('Stdin closed. Closing server and clients...');

    // notify clients then end connections
    sseClients.forEach(res => {
        res.write('event: end\ndata: {}\n\n');
        res.end();
    });

    const exitCode = successReceived ? 0 : 1;

    if (exitCode === 1) {
        console.error(`Preparation did not complete successfully. Did not receive expected success message of "${expectedSuccessMessage}".`);
    }

    console.log('Exiting process with code', exitCode);

    // Ensure server is closed before exiting so sockets are cleaned up
    try {
      let closed = false;
      server.close(() => {
        closed = true;
        process.exit(exitCode);
      });

      // After a short delay, destroy any remaining sockets to unblock close
      setTimeout(() => {
        if (!closed) {
          connections.forEach(s => {
            try { s.destroy(); } catch (e) { console.log(e); }
          });
        }
      }, 2000);

      // Final safety: force exit if still not closed after longer timeout
      setTimeout(() => process.exit(exitCode), 5000);
    } catch (e) {
      console.log(e);
      process.exit(exitCode);
    }
});

process.stdin.resume();
