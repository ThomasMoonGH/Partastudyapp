// LiveKit configuration for Supabase Edge Functions

export const LIVEKIT_CONFIG = {
  // API ключи для LiveKit Cloud (задаются через переменные окружения)
  API_KEY: Deno.env.get('LIVEKIT_API_KEY') ?? '',
  API_SECRET: Deno.env.get('LIVEKIT_API_SECRET') ?? '',
  
  // LiveKit Cloud URL
  URL: Deno.env.get('LIVEKIT_URL') || 'wss://partastudyapp-3jhslurr.livekit.cloud',
  
  // Настройки токенов
  TOKEN_TTL: '24h', // Время жизни токена
  ROOM_JOIN: true,
  CAN_PUBLISH: true,
  CAN_SUBSCRIBE: true,
  CAN_PUBLISH_DATA: true,
};

// Валидация конфигурации
export function validateLiveKitConfig() {
  if (!LIVEKIT_CONFIG.API_KEY || !LIVEKIT_CONFIG.API_SECRET) {
    throw new Error('LiveKit API credentials not configured');
  }
  
  if (!LIVEKIT_CONFIG.URL) {
    throw new Error('LiveKit server URL not configured');
  }
  
  return true;
}
