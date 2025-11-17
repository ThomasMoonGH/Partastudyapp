// Простой скрипт для генерации LiveKit токена
// Используется для тестирования без Supabase

const crypto = require('crypto');

function generateLiveKitToken(apiKey, apiSecret, roomName, participantName, metadata) {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API key/secret are required');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: participantName,
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

  if (metadata) {
    payload.metadata = metadata;
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLiveKitToken };
}

// Если запускается напрямую
if (require.main === module) {
  try {
    const {
      LIVEKIT_API_KEY = 'your_api_key',
      LIVEKIT_API_SECRET = 'your_api_secret',
      ROOM_NAME = 'test-room',
      PARTICIPANT_NAME = 'test-user',
    } = process.env;

    const token = generateLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      ROOM_NAME,
      PARTICIPANT_NAME,
    );

    console.log('Generated token:', token);
  } catch (err) {
    console.error('Failed to generate token:', err);
    process.exit(1);
  }
}
