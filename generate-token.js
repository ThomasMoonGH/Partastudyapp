// Простой скрипт для генерации LiveKit токена
// Используется для тестирования без Supabase

const crypto = require('crypto');

function generateLiveKitToken(apiKey, apiSecret, roomName, participantName) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    iss: apiKey,
    sub: participantName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 час
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    }
  };
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLiveKitToken };
}

// Если запускается напрямую
if (require.main === module) {
  const token = generateLiveKitToken('devkey', 'devkey_secret_partastudy_2025', 'test-room', 'test-user');
  console.log('Generated token:', token);
}
