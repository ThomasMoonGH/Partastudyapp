// Простой HTTP сервер для генерации LiveKit токенов (без зависимости от SDK)
const http = require('http');
const crypto = require('crypto');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_HOST =
  process.env.LIVEKIT_HOST ||
  process.env.VITE_LIVEKIT_URL ||
  'wss://partastudyapp-3jhslurr.livekit.cloud';

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn('⚠️  LIVEKIT_API_KEY или LIVEKIT_API_SECRET не заданы. Генерация токенов будет возвращать 500.');
}

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function normalizeMetadata(metadata, displayName) {
  if (metadata === undefined || metadata === null) {
    return displayName ? JSON.stringify({ displayName }) : undefined;
  }
  if (typeof metadata === 'string') {
    return metadata;
  }
  try {
    return JSON.stringify(metadata);
  } catch (err) {
    console.warn('Failed to stringify metadata, ignoring', err);
    return undefined;
  }
}

function signToken({ roomName, identity, displayName, metadata }) {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit credentials are not configured.');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: identity,
    nbf: now,
    iat: now,
    exp: now + 60 * 60,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const normalizedMetadata = normalizeMetadata(metadata, displayName);
  if (normalizedMetadata) {
    payload.metadata = normalizedMetadata;
  }
  if (displayName) {
    payload.name = displayName;
  }

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signature = crypto
    .createHmac('sha256', LIVEKIT_API_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
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
        const {
          roomName,
          participantName,
          participantIdentity,
          participantDisplayName,
          metadata,
        } = data;

        const identity = participantIdentity || participantName;
        const displayName = participantDisplayName || participantName;

        if (!roomName || !identity) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'roomName and participantName are required',
          }));
          return;
        }

        const token = signToken({
          roomName,
          identity,
          displayName,
          metadata,
        });
        
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
