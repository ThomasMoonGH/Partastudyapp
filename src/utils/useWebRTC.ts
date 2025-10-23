import { useState, useEffect, useRef, useCallback } from 'react';
import { WebRTCConnection } from './webrtc';
import { projectId, publicAnonKey } from './supabase/info';

interface UseWebRTCProps {
  sessionId: string;
  userId: string;
  userName: string;
  enabled: boolean;
  autoStartMedia?: boolean; // Whether to automatically request media access
}

export function useWebRTC({ sessionId, userId, userName, enabled, autoStartMedia = false }: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);
  const [hasRequestedMedia, setHasRequestedMedia] = useState(false);

  const webrtcRef = useRef<WebRTCConnection | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const partnerUserIdRef = useRef<string | null>(null);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36`;

  // Send offer to partner
  const sendOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!partnerUserIdRef.current) return;

    await fetch(`${serverUrl}/webrtc/offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        sessionId,
        fromUserId: userId,
        toUserId: partnerUserIdRef.current,
        offer,
      }),
    });
    console.log('Sent offer to partner:', partnerUserIdRef.current);
  }, [sessionId, userId, serverUrl]);

  // Request media access manually
  const requestMediaAccess = useCallback(async () => {
    if (!webrtcRef.current || hasRequestedMedia) return true;

    console.log('Requesting media access...');
    setHasRequestedMedia(true);
    setMediaPermissionDenied(false);
    setError(null);

    try {
      // Start local stream
      const stream = await webrtcRef.current.startLocalStream(false, true);
      setLocalStream(stream);
      console.log('Media access granted');

      // If we already have a partner connected, we need to renegotiate
      if (partnerUserIdRef.current) {
        console.log('Renegotiating connection with new media tracks...');
        const offer = await webrtcRef.current.createOffer();
        await sendOffer(offer);
        console.log('Sent renegotiation offer to partner');
      }

      return true;
    } catch (err) {
      // Only log unexpected errors (not permission denials)
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        console.error('Error accessing media devices:', err);
      }
      setMediaPermissionDenied(true);
      setHasRequestedMedia(false); // Reset so user can try again
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Доступ к микрофону отклонён. Пожалуйста, разрешите доступ в настройках браузера.');
        } else if (err.name === 'NotFoundError') {
          setError('Микрофон не найден. Пожалуйста, подключите микрофон.');
        } else {
          setError('Не удалось получить доступ к микрофону: ' + err.message);
        }
      }
      return false;
    }
  }, [hasRequestedMedia, sendOffer]);

  // Initialize WebRTC connection
  const initializeConnection = useCallback(async () => {
    if (!enabled || webrtcRef.current) return;

    console.log('Initializing WebRTC connection...');
    setIsConnecting(true);
    setError(null);

    try {
      // Join session and get other participants
      const joinResponse = await fetch(`${serverUrl}/webrtc/join-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ sessionId, userId, userName }),
      });

      if (!joinResponse.ok) {
        throw new Error('Failed to join session');
      }

      const { participants } = await joinResponse.json();
      console.log('Other participants:', participants);

      // Create WebRTC connection
      const webrtc = new WebRTCConnection(sessionId, userId);
      await webrtc.initialize();

      // Set up callbacks
      webrtc.onRemoteStream((stream) => {
        console.log('Received remote stream');
        setRemoteStream(stream);
      });

      webrtc.onIceCandidate((candidate) => {
        if (partnerUserIdRef.current) {
          // Send ICE candidate to partner
          fetch(`${serverUrl}/webrtc/ice-candidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              sessionId,
              fromUserId: userId,
              toUserId: partnerUserIdRef.current,
              candidate: candidate.toJSON(),
            }),
          }).catch((err) => console.error('Failed to send ICE candidate:', err));
        }
      });

      webrtc.onConnectionState((state) => {
        console.log('Connection state:', state);
        setConnectionState(state);
      });

      webrtcRef.current = webrtc;

      // Only request media if autoStartMedia is true
      if (autoStartMedia) {
        await requestMediaAccess();
      }

      // If there are other participants, start signaling
      if (participants.length > 0) {
        const partner = participants[0];
        partnerUserIdRef.current = partner.userId;
        console.log('Creating offer for partner:', partner.userId);

        // Create and send offer
        const offer = await webrtc.createOffer();
        await fetch(`${serverUrl}/webrtc/offer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            sessionId,
            fromUserId: userId,
            toUserId: partner.userId,
            offer,
          }),
        });

        // Start polling for answer
        startPollingForAnswer(partner.userId);
      } else {
        // Wait for other participants - poll for offers
        startPollingForOffers();
      }

      setIsConnecting(false);
    } catch (err) {
      console.error('Error initializing WebRTC:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize connection';
      setError('Ошибка подключения: ' + errorMessage);
      setIsConnecting(false);
    }
  }, [enabled, sessionId, userId, userName, serverUrl, autoStartMedia, requestMediaAccess]);

  // Poll for offers from other users
  const startPollingForOffers = useCallback(() => {
    if (pollingIntervalRef.current) return;

    console.log('Polling for offers...');
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // We don't know the partner's userId yet, so we check all possible offers
        // In a real app, you'd get the list of other participants
        const joinResponse = await fetch(`${serverUrl}/webrtc/join-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ sessionId, userId, userName }),
        });

        const { participants } = await joinResponse.json();
        
        for (const partner of participants) {
          const offerResponse = await fetch(
            `${serverUrl}/webrtc/offer/${sessionId}/${partner.userId}/${userId}`,
            {
              headers: { Authorization: `Bearer ${publicAnonKey}` },
            }
          );

          const { offer } = await offerResponse.json();

          if (offer && webrtcRef.current) {
            console.log('Received offer from:', partner.userId);
            partnerUserIdRef.current = partner.userId;

            // Stop polling for offers
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            // Set remote description and create answer
            await webrtcRef.current.setRemoteDescription(offer);
            const answer = await webrtcRef.current.createAnswer();

            // Send answer
            await fetch(`${serverUrl}/webrtc/answer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                sessionId,
                fromUserId: userId,
                toUserId: partner.userId,
                answer,
              }),
            });

            // Start polling for ICE candidates
            startPollingForIceCandidates(partner.userId);
            break;
          }
        }
      } catch (err) {
        console.error('Error polling for offers:', err);
      }
    }, 2000);
  }, [sessionId, userId, userName, serverUrl]);

  // Poll for answer
  const startPollingForAnswer = useCallback((partnerUserId: string) => {
    if (pollingIntervalRef.current) return;

    console.log('Polling for answer from:', partnerUserId);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const answerResponse = await fetch(
          `${serverUrl}/webrtc/answer/${sessionId}/${partnerUserId}/${userId}`,
          {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          }
        );

        const { answer } = await answerResponse.json();

        if (answer && webrtcRef.current) {
          console.log('Received answer');

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          await webrtcRef.current.setRemoteDescription(answer);

          // Start polling for ICE candidates
          startPollingForIceCandidates(partnerUserId);
        }
      } catch (err) {
        console.error('Error polling for answer:', err);
      }
    }, 2000);
  }, [sessionId, userId, serverUrl]);

  // Poll for ICE candidates
  const startPollingForIceCandidates = useCallback((partnerUserId: string) => {
    console.log('Polling for ICE candidates from:', partnerUserId);
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${serverUrl}/webrtc/ice-candidates/${sessionId}/${partnerUserId}/${userId}`,
          {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          }
        );

        const { candidates } = await response.json();

        if (candidates && candidates.length > 0 && webrtcRef.current) {
          console.log('Received ICE candidates:', candidates.length);
          for (const candidate of candidates) {
            await webrtcRef.current.addIceCandidate(candidate);
          }
        }
      } catch (err) {
        console.error('Error polling for ICE candidates:', err);
      }
    }, 2000);

    // Store interval for cleanup
    if (!pollingIntervalRef.current) {
      pollingIntervalRef.current = pollInterval;
    }
  }, [sessionId, userId, serverUrl]);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (webrtcRef.current) {
      webrtcRef.current.setVideoEnabled(enabled);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (webrtcRef.current) {
      webrtcRef.current.setAudioEnabled(enabled);
    }
  }, []);

  // Reconnect (для автоматического восстановления соединения)
  const reconnect = useCallback(async () => {
    console.log('Reconnecting WebRTC...');
    
    // Очищаем текущее соединение
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (webrtcRef.current) {
      await webrtcRef.current.close();
      webrtcRef.current = null;
    }

    // Повторная инициализация
    await initializeConnection();
  }, [initializeConnection]);

  // Cleanup
  const cleanup = useCallback(async () => {
    console.log('Cleaning up WebRTC connection');

    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Close WebRTC connection
    if (webrtcRef.current) {
      await webrtcRef.current.close();
      webrtcRef.current = null;
    }

    // Leave session
    try {
      await fetch(`${serverUrl}/webrtc/leave-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ sessionId, userId }),
      });
    } catch (err) {
      console.error('Error leaving session:', err);
    }

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('closed');
  }, [sessionId, userId, serverUrl]);

  // Initialize on mount
  useEffect(() => {
    if (enabled) {
      initializeConnection();
    }

    return () => {
      cleanup();
    };
  }, [enabled, initializeConnection, cleanup]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isConnecting,
    error,
    mediaPermissionDenied,
    hasRequestedMedia,
    requestMediaAccess,
    toggleVideo,
    toggleAudio,
    peerConnection: webrtcRef.current?.getPeerConnection() || null,
    reconnect,
  };
}
