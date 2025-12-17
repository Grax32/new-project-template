import http from 'http';
import { AnsiUp } from 'ansi_up';
import config from './services/config';

// This will be sent if preparation completes successfully
const expectedSuccessMessage = 'Preparation complete.';
const expectedSuccessMessageWillNotHave = "echo";

const ansi_up = new AnsiUp();
let sseClients: http.ServerResponse[] = [];
const chunks: Buffer[] = [];
let successReceived = false;

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
          const terminal = document.getElementById('terminal');
          const es = new EventSource('/events');
          es.onmessage = (e) => {
            try {
              const html = JSON.parse(e.data);
              terminal.innerHTML += html;
              window.scrollTo(0, document.body.scrollHeight);
            } catch (err) {
              console.error('Failed to parse event data', err);
            }
          };
          es.onerror = () => {
            // Try to reconnect is handled by EventSource automatically
          };
        </script>
      </body>
    </html>
  `);
});

server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
});

// Stream stdin to all SSE clients and store it for replay
process.stdin.on('data', chunk => {
    // show in console
    console.log(chunk.toString('utf-8'));

    // capture for replay if a client joins late
    chunks.push(Buffer.from(chunk));

    // send to all SSE clients
    const html = ansi_up.ansi_to_html(chunk.toString());
    const payload = `data: ${JSON.stringify(html)}\n\n`;
    sseClients.forEach(res => res.write(payload));

    // Track expected success message as data arrives to avoid edge cases
    const containsSuccessMessage = chunk.toString('utf-8').includes(expectedSuccessMessage);
    const containsUnexpectedMessage = chunk.toString('utf-8').includes(expectedSuccessMessageWillNotHave);

    const reallyContainsSuccessMessage = containsSuccessMessage && !containsUnexpectedMessage;

    successReceived ||= reallyContainsSuccessMessage;
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
        server.close(() => process.exit(exitCode));
    } catch (e) {
        console.log(e);
        process.exit(exitCode);
    }
});

process.stdin.resume();
