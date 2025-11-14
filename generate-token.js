// Простой скрипт для генерации LiveKit токена
// Используется для тестирования без Supabase

const { AccessToken, VideoGrant } = require('livekit-server-sdk');

function generateLiveKitToken(apiKey, apiSecret, roomName, participantName, metadata) {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    metadata,
  });

  at.addGrant(
    new VideoGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    }),
  );

  at.setValidFor(60 * 60);

  return at.toJwt();
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLiveKitToken };
}

// Если запускается напрямую
if (require.main === module) {
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
}
