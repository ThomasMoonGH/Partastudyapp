// Встроенная генерация LiveKit токена в браузере
// Использует Web Crypto API для создания HMAC подписи

export async function generateLiveKitToken(apiKey, apiSecret, roomName, participantName) {
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
  
  // Кодируем header и payload в base64url
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Создаем подпись с помощью Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const message = encoder.encode(`${headerB64}.${payloadB64}`);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
