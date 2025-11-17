const crypto = require('crypto');

function normalizeMetadata(metadata, displayName) {
  if (metadata === undefined || metadata === null) {
    return displayName ? JSON.stringify({ displayName }) : undefined;
  }
  if (typeof metadata === 'string') {
    return metadata;
  }
  try {
    return JSON.stringify(metadata);
  } catch {
    return displayName ? JSON.stringify({ displayName }) : undefined;
  }
}

function generateLiveKitToken({
  apiKey,
  apiSecret,
  roomName,
  identity,
  displayName,
  metadata,
}) {
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API key/secret are required');
  }
  if (!roomName || !identity) {
    throw new Error('roomName and identity are required');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
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

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLiveKitToken };
}

if (require.main === module) {
  try {
    const {
      LIVEKIT_API_KEY = 'your_api_key',
      LIVEKIT_API_SECRET = 'your_api_secret',
      ROOM_NAME = 'test-room',
      PARTICIPANT_IDENTITY = `cli-user-${Date.now().toString(36)}`,
      PARTICIPANT_NAME,
      METADATA,
    } = process.env;

    const token = generateLiveKitToken({
      apiKey: LIVEKIT_API_KEY,
      apiSecret: LIVEKIT_API_SECRET,
      roomName: ROOM_NAME,
      identity: PARTICIPANT_IDENTITY,
      displayName: PARTICIPANT_NAME,
      metadata: METADATA,
    });

    console.log('Generated token:', token);
  } catch (err) {
    console.error('Failed to generate token:', err);
    process.exit(1);
  }
}
// Простой скрипт для генерации LiveKit токена
// Используется для тестирования без Supabase

