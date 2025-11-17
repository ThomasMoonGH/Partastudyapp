import { Room, RoomEvent, Track, RemoteParticipant, LocalParticipant } from 'livekit-client';

export interface LiveKitConnectionConfig {
  livekitUrl: string;
  token: string;
  roomName: string;
  participantName: string;
}

export interface LiveKitConnectionCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onParticipantConnected?: (participant: RemoteParticipant) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onTrackSubscribed?: (track: Track, publication: any, participant: RemoteParticipant) => void;
  onTrackUnsubscribed?: (track: Track, publication: any, participant: RemoteParticipant) => void;
  onConnectionStateChanged?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
}

export class LiveKitConnection {
  private room: Room | null = null;
  private config: LiveKitConnectionConfig;
  private callbacks: LiveKitConnectionCallbacks;
  private isConnecting = false;
  private isConnected = false;
  private localMediaStream: MediaStream | null = null;

  constructor(config: LiveKitConnectionConfig, callbacks: LiveKitConnectionCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('Already connecting or connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('Connecting to LiveKit:', this.config.livekitUrl);

      // Создаем комнату
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Настраиваем обработчики событий
      this.setupEventHandlers();

      // Подключаемся к комнате
      await this.room.connect(this.config.livekitUrl, this.config.token);
      
      this.isConnected = true;
      this.isConnecting = false;
      
      console.log('Connected to LiveKit room:', this.room.name);
      this.callbacks.onConnected?.();
      
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to connect to LiveKit:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      console.log('Disconnecting from LiveKit');
      await this.room.disconnect();
      this.room = null;
      this.isConnected = false;
      this.callbacks.onDisconnected?.();
    }
    if (this.localMediaStream) {
      this.localMediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('Failed to stop track on disconnect', err);
        }
      });
      this.localMediaStream = null;
    }
  }

  async enableCameraAndMicrophone(): Promise<MediaStream | null> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      console.log('🎬 Enabling camera and microphone in LiveKit...');
      
      // Сначала получаем медиа поток напрямую от браузера
      console.log('📱 Requesting getUserMedia...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      console.log('📱 Got media stream from browser:', mediaStream);
      console.log('📱 Stream tracks:', mediaStream.getTracks());
      console.log('📱 Video tracks:', mediaStream.getVideoTracks());
      console.log('📱 Audio tracks:', mediaStream.getAudioTracks());
      
      // Затем включаем камеру и микрофон в LiveKit
      console.log('🔗 Enabling camera and microphone in LiveKit room...');
      await this.room.localParticipant.enableCameraAndMicrophone();
      
      // LiveKit автоматически публикует треки при вызове enableCameraAndMicrophone()
      // Нам не нужно публиковать их вручную
      console.log('✅ Camera and microphone enabled in LiveKit');
      
      // Сохраняем поток для дальнейшего использования
      const mergedStream = new MediaStream();
      mediaStream.getTracks().forEach(track => mergedStream.addTrack(track));
      this.room.localParticipant.getTrackPublications().forEach(pub => {
        if (pub.track) {
          const cloned = pub.track.mediaStreamTrack.clone();
          mergedStream.addTrack(cloned);
        }
      });

      this.localMediaStream = mergedStream;
      
      console.log('✅ Published tracks, returning stream:', mergedStream);
      return mergedStream;
      
    } catch (error) {
      console.error('Failed to enable camera and microphone:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async toggleVideo(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      const isCurrentlyEnabled = this.room.localParticipant.isCameraEnabled;
      console.log('Toggling video, currently enabled:', isCurrentlyEnabled);
      
      if (isCurrentlyEnabled) {
        // Выключаем камеру - отключаем публикацию и останавливаем трек
        console.log('🔄 Disabling camera publication...');
        await this.room.localParticipant.setCameraEnabled(false);
        
        // Останавливаем видео трек, чтобы выключить физический индикатор
        if (this.localMediaStream) {
          const videoTrack = this.localMediaStream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('🔄 Stopping video track...');
            videoTrack.stop();
            console.log('✅ Video track stopped');
          }
        }
        
        console.log('✅ Camera publication disabled');
      } else {
        // Включаем камеру - всегда создаем новый поток
        console.log('🔄 Enabling camera, getting new stream...');
        
        // Сначала удаляем все существующие треки
        const allTracks = this.room.localParticipant.getTrackPublications();
        const existingVideoTracks = allTracks.filter(trackPub => trackPub.source === Track.Source.Camera);
        const existingAudioTracks = allTracks.filter(trackPub => trackPub.source === Track.Source.Microphone);
        
        for (const trackPub of existingVideoTracks) {
          if (trackPub.track) {
            console.log('🔄 Unpublishing existing video track...');
            await this.room.localParticipant.unpublishTrack(trackPub.track);
          }
        }
        
        for (const trackPub of existingAudioTracks) {
          if (trackPub.track) {
            console.log('🔄 Unpublishing existing audio track...');
            await this.room.localParticipant.unpublishTrack(trackPub.track);
          }
        }
        
        // Останавливаем старый поток если есть
      if (this.localMediaStream) {
        this.localMediaStream.getTracks().forEach(track => track.stop());
      }
        
        // Создаем новый поток
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const newAudioTrack = newStream.getAudioTracks()[0];
        
        if (newVideoTrack) {
          // Устанавливаем новый поток
          this.localMediaStream = newStream;
          
          // Публикуем треки напрямую
          console.log('🔄 Publishing new video track...');
          await this.room.localParticipant.publishTrack(newVideoTrack, {
            source: Track.Source.Camera,
          });
          
          if (newAudioTrack) {
            console.log('🔄 Publishing new audio track...');
            await this.room.localParticipant.publishTrack(newAudioTrack, {
              source: Track.Source.Microphone,
            });
          }
          
          // Включаем камеру и микрофон
          console.log('🔄 Enabling camera and microphone...');
          await this.room.localParticipant.setCameraEnabled(true);
          await this.room.localParticipant.setMicrophoneEnabled(true);
          
          console.log('✅ Camera enabled with new stream');
        } else {
          console.log('❌ No video track in new stream');
        }
      }
    } catch (error) {
      console.error('Failed to toggle video:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async toggleAudio(): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to room');
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(!this.room.localParticipant.isMicrophoneEnabled);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  getLocalStream(): MediaStream | null {
    // Возвращаем сохраненный локальный поток
    return this.localMediaStream || null;
  }

  getRemoteStream(): MediaStream | null {
    if (!this.room) return null;
    
    const remoteParticipants = Array.from(this.room.remoteParticipants.values());
    if (remoteParticipants.length === 0) return null;
    
    const firstParticipant = remoteParticipants[0] as RemoteParticipant;
    const videoTrack = firstParticipant.getTrackPublication(Track.Source.Camera);
    return videoTrack?.track?.mediaStream || null;
  }

  getConnectionState(): RTCPeerConnectionState {
    if (!this.room) return 'closed';
    return this.room.state;
  }

  isVideoEnabled(): boolean {
    if (!this.room) return false;
    const videoTrack = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
    return videoTrack?.track?.isEnabled ?? false;
  }

  isAudioEnabled(): boolean {
    if (!this.room) return false;
    return this.room.localParticipant.isMicrophoneEnabled;
  }

  private setupEventHandlers(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.Connected, () => {
      console.log('LiveKit room connected');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('LiveKit room disconnected');
      this.isConnected = false;
      this.callbacks.onDisconnected?.();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      this.callbacks.onParticipantConnected?.(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      this.callbacks.onParticipantDisconnected?.(participant);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      this.callbacks.onTrackSubscribed?.(track, publication, participant);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
      console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      this.callbacks.onTrackUnsubscribed?.(track, publication, participant);
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state: RTCPeerConnectionState) => {
      console.log('Connection state changed:', state);
      this.callbacks.onConnectionStateChanged?.(state);
    });
  }
}
