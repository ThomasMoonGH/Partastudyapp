import { useEffect, useRef, useCallback } from 'react';

interface UseWebRTCReconnectProps {
  connectionState: RTCPeerConnectionState;
  onReconnect: () => Promise<void>;
  enabled: boolean;
  maxRetries?: number;
}

/**
 * Hook для автоматического переподключения WebRTC при разрыве соединения
 * 
 * Стратегия:
 * - Отслеживаем connectionState
 * - При 'failed' или 'disconnected' пытаемся переподключиться
 * - Exponential backoff: 1s, 2s, 4s, 8s, 16s
 * - После maxRetries показываем ошибку
 */
export function useWebRTCReconnect({
  connectionState,
  onReconnect,
  enabled,
  maxRetries = 5,
}: UseWebRTCReconnectProps) {
  const retriesRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  const attemptReconnect = useCallback(async () => {
    if (!enabled || isReconnectingRef.current) return;

    // Очищаем предыдущий таймаут
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Проверяем лимит попыток
    if (retriesRef.current >= maxRetries) {
      console.error(`Failed to reconnect after ${maxRetries} attempts`);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 16000);
    console.log(`Attempting reconnection in ${delay}ms (attempt ${retriesRef.current + 1}/${maxRetries})`);

    timeoutRef.current = setTimeout(async () => {
      isReconnectingRef.current = true;
      retriesRef.current += 1;

      try {
        console.log('Initiating reconnection...');
        await onReconnect();
        console.log('Reconnection successful');
        
        // Сбрасываем счётчик при успехе
        retriesRef.current = 0;
      } catch (error) {
        console.error('Reconnection failed:', error);
        
        // Пробуем снова если не достигли лимита
        if (retriesRef.current < maxRetries) {
          attemptReconnect();
        }
      } finally {
        isReconnectingRef.current = false;
      }
    }, delay);
  }, [enabled, maxRetries, onReconnect]);

  useEffect(() => {
    if (!enabled) return;

    // Отслеживаем состояние соединения
    if (connectionState === 'failed' || connectionState === 'disconnected') {
      console.warn(`Connection ${connectionState}, attempting reconnection...`);
      attemptReconnect();
    } else if (connectionState === 'connected') {
      // Успешное соединение - сбрасываем счётчик
      retriesRef.current = 0;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connectionState, enabled, attemptReconnect]);

  return {
    isReconnecting: isReconnectingRef.current,
    retryCount: retriesRef.current,
    maxRetries,
  };
}
