const localtunnel = require('localtunnel');
const fs = require('fs');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 5173 });
    console.log('>>> PUBLIC_URL:', tunnel.url);
    fs.writeFileSync('tunnel_url.txt', tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed, reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Failed to create tunnel, retrying in 3s...', err);
    setTimeout(startTunnel, 3000);
  }
}

startTunnel();

// Keepalive loop so Node process never terminates
setInterval(() => {}, 60000);
