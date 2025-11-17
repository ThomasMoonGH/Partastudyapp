// Простой скрипт для генерации LiveKit токена
// Используется для тестирования без Supabase

const { AccessToken } = require('livekit-server-sdk');

async function generateLiveKitToken(apiKey, apiSecret, roomName, participantName, metadata) {
  const at = new AccessToken(apiKey, apiSecret, {
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
  at.exp = now + 60 * 60;

  return await at.toJwt();
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLiveKitToken };
}

// Если запускается напрямую
if (require.main === module) {
  (async () => {
    const {
      LIVEKIT_API_KEY = 'your_api_key',
      LIVEKIT_API_SECRET = 'your_api_secret',
      ROOM_NAME = 'test-room',
      PARTICIPANT_NAME = 'test-user',
    } = process.env;

    const token = await generateLiveKitToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      ROOM_NAME,
      PARTICIPANT_NAME,
    );

    console.log('Generated token:', token);
  })().catch((err) => {
    console.error('Failed to generate token:', err);
    process.exit(1);
  });
}
