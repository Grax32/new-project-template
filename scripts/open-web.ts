import open from 'open';

const url = process.argv[2] || 'http://localhost:4200';

console.log(`Opening browser to ${url}...`);

open(url, { wait: true }).then(() => {
    console.log('Browser opened successfully.');
}).catch((err) => {
    console.error('Failed to open browser:', err);
});
