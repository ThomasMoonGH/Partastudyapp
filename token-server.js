// Простой HTTP сервер для генерации LiveKit токенов
const http = require('http');
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_HOST = process.env.LIVEKIT_HOST || process.env.VITE_LIVEKIT_URL;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('⚠️  LIVEKIT_API_KEY или LIVEKIT_API_SECRET не заданы. Генерация токенов будет возвращать 500.');
}

if (!LIVEKIT_HOST) {
  console.warn('⚠️  LIVEKIT_HOST не задан. Клиенту будет возвращён пустой livekitUrl.');
}

async function generateLiveKitToken(roomName, participantName, metadata) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials are not configured.');
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    metadata,
  });

  at.addGrant({
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  });

  const now = Math.floor(Date.now() / 1000);
  at.nbf = now;
  at.exp = now + 60 * 60; // 1 час

  return await at.toJwt();
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/generate-token') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { roomName, participantName, metadata } = data;

        if (!roomName || !participantName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'roomName and participantName are required',
          }));
          return;
        }

        const token = await generateLiveKitToken(roomName, participantName, metadata);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          token,
          livekitUrl: LIVEKIT_HOST || null,
          expiresIn: 3600,
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Token server running on http://localhost:${PORT}`);
});
