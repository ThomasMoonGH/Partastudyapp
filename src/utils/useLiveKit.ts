import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LiveKitConnection, LiveKitConnectionConfig, LiveKitConnectionCallbacks } from './livekit';

export interface UseLiveKitOptions {
  sessionId: string;
  userId: string;
  userName: string;
  enabled: boolean;
  autoStartMedia?: boolean;
}

export interface UseLiveKitReturn {
  // Streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  
  // Connection state
  connectionState: RTCPeerConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  
  // Media state
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  
  // Error handling
  error: Error | null;
  mediaPermissionDenied: boolean;
  hasRequestedMedia: boolean;
  
  // Actions
  requestMediaAccess: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Internal
  peerConnection: RTCPeerConnection | null;
}

export function useLiveKit({
  sessionId,
  userId,
  userName,
  enabled,
  autoStartMedia = false
}: UseLiveKitOptions): UseLiveKitReturn {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('closed');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
  const [hasRequestedMedia, setHasRequestedMedia] = useState(false);

  // Refs
  const connectionRef = useRef<LiveKitConnection | null>(null);
  const tokenRef = useRef<string | null>(null);
  const roomNameRef = useRef<string>(`session-${sessionId}`);

  // Получение токена от сервера в контейнере
  const fetchLiveKitToken = useCallback(async (): Promise<string> => {
    try {
      console.log('Generating LiveKit token for:', {
        roomName: roomNameRef.current,
        participantName: userName,
        sessionId,
        userEmail: userId,
      });
      
      const tokenEndpoint =
        ((import.meta as any).env?.VITE_TOKEN_ENDPOINT as string | undefined) || '/generate-token';
      const tokenUrl = /^https?:\/\//i.test(tokenEndpoint)
        ? tokenEndpoint
        : `${window.location.origin}${tokenEndpoint}`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomNameRef.current,
          participantName: userName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get LiveKit token: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Generated token:', data.token);
      return data.token;
    } catch (error) {
      console.error('Error fetching LiveKit token:', error);
      throw error;
    }
  }, [sessionId, userId, userName]);

  // Подключение к LiveKit
  const connect = useCallback(async () => {
    if (!enabled || isConnecting || isConnected) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Получаем токен
      const token = await fetchLiveKitToken();
      tokenRef.current = token;

      // Создаем конфигурацию
      const envLivekitUrl = ((import.meta as any).env?.VITE_LIVEKIT_URL as string | undefined)?.trim();
      let livekitUrl = envLivekitUrl;
      if (
        !livekitUrl ||
        /^ws:\/\/localhost/i.test(livekitUrl) ||
        /^ws:\/\/livekit/i.test(livekitUrl)
      ) {
        const origin = window.location.origin.replace(/^http/i, 'ws');
        livekitUrl = `${origin}/rtc`;
      }

      const config: LiveKitConnectionConfig = {
        livekitUrl,
        token,
        roomName: roomNameRef.current,
        participantName: userName,
      };

      // Создаем соединение
      const connection = new LiveKitConnection(config, {
        onConnected: () => {
          setIsConnected(true);
          setIsConnecting(false);
          console.log('LiveKit connected');
        },
        onDisconnected: () => {
          setIsConnected(false);
          setLocalStream(null);
          setRemoteStream(null);
          console.log('LiveKit disconnected');
        },
        onParticipantConnected: (participant) => {
          console.log('Participant connected:', participant.identity);
        },
        onParticipantDisconnected: (participant) => {
          console.log('Participant disconnected:', participant.identity);
        },
        onTrackSubscribed: (track, publication, participant) => {
          console.log('Track subscribed:', track.kind, 'from', participant.identity);
          if (track.kind === 'video') {
            const mediaStream = track.mediaStream;
            if (mediaStream) {
              setRemoteStream(mediaStream);
            }
          }
        },
        onTrackUnsubscribed: (track, publication, participant) => {
          console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
          if (track.kind === 'video') {
            setRemoteStream(null);
          }
        },
        onConnectionStateChanged: (state) => {
          setConnectionState(state);
        },
        onError: (error) => {
          console.error('LiveKit error:', error);
          setError(error instanceof Error ? error : new Error(String(error)));
          setIsConnecting(false);
        },
      });

      connectionRef.current = connection;
      await connection.connect();

    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
      setIsConnecting(false);
    }
  }, [enabled, isConnecting, isConnected, fetchLiveKitToken, userName]);

  // Запрос доступа к медиа
  const requestMediaAccess = useCallback(async () => {
    if (!connectionRef.current) {
      console.error('Not connected to LiveKit');
      return;
    }

    try {
      console.log('🎬 Starting media access request...');
      setHasRequestedMedia(true);
      setMediaPermissionDenied(false);
      setError(null);

      console.log('📹 Requesting camera and microphone...');
      const stream = await connectionRef.current.enableCameraAndMicrophone();
      console.log('📹 Received stream:', stream);
      
      if (stream) {
        console.log('📹 Stream tracks:', stream.getTracks());
        console.log('📹 Video tracks:', stream.getVideoTracks());
        console.log('📹 Audio tracks:', stream.getAudioTracks());
        
        setLocalStream(stream);
        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
        console.log('✅ Local stream set, video enabled:', true);
      } else {
        console.log('❌ No stream received from enableCameraAndMicrophone');
      }

    } catch (error) {
      console.error('❌ Failed to request media access:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setMediaPermissionDenied(true);
      }
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  // Переключение видео
  const toggleVideo = useCallback(async () => {
    if (!connectionRef.current) return;

    try {
      console.log('🔄 Toggling video in useLiveKit...');
      await connectionRef.current.toggleVideo();
      const enabled = connectionRef.current.isVideoEnabled();
      setIsVideoEnabled(enabled);
      
      // Обновляем локальный поток после переключения
      const updatedStream = connectionRef.current.getLocalStream();
      if (updatedStream) {
        console.log('📹 Updating local stream after toggle:', updatedStream);
        setLocalStream(updatedStream);
      }
      
      console.log('✅ Video toggled, enabled:', enabled, 'stream:', !!updatedStream);
    } catch (error) {
      console.error('Failed to toggle video:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  // Переключение аудио
  const toggleAudio = useCallback(async () => {
    if (!connectionRef.current) return;

    try {
      await connectionRef.current.toggleAudio();
      setIsAudioEnabled(connectionRef.current.isAudioEnabled());
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  // Отключение
  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStream(null);
    setHasRequestedMedia(false);
  }, []);

  // Переподключение
  const reconnect = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  // Автоматическое подключение при изменении enabled
  useEffect(() => {
    if (enabled && !isConnected && !isConnecting) {
      connect();
    } else if (!enabled && isConnected) {
      disconnect();
    }
  }, [enabled, isConnected, isConnecting, connect, disconnect]);

  // Автоматический запрос медиа если включен
  useEffect(() => {
    if (isConnected && autoStartMedia && !hasRequestedMedia) {
      requestMediaAccess();
    }
  }, [isConnected, autoStartMedia, hasRequestedMedia, requestMediaAccess]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
      }
    };
  }, []);

  return {
    localStream,
    remoteStream,
    connectionState,
    isConnecting,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    error,
    mediaPermissionDenied,
    hasRequestedMedia,
    requestMediaAccess,
    toggleVideo,
    toggleAudio,
    disconnect,
    reconnect,
    peerConnection: null, // LiveKit скрывает RTCPeerConnection
  };
}
