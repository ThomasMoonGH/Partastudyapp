import { RefObject } from 'react';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

// Free STUN servers for WebRTC
export const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private sessionId: string;
  private userId: string;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onIceCandidateCallback?: (candidate: RTCIceCandidate) => void;
  private onConnectionStateCallback?: (state: RTCPeerConnectionState) => void;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async initialize(config: WebRTCConfig = DEFAULT_WEBRTC_CONFIG) {
    this.peerConnection = new RTCPeerConnection(config);

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        console.log('Generated ICE candidate');
        this.onIceCandidateCallback(event.candidate);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state changed:', state);
      if (state && this.onConnectionStateCallback) {
        this.onConnectionStateCallback(state);
      }
    };
  }

  async startLocalStream(videoEnabled: boolean = false, audioEnabled: boolean = true) {
    try {
      // Don't request again if already exists
      if (this.localStream) {
        console.log('Local stream already exists');
        return this.localStream;
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });

      console.log('Local stream started:', { 
        video: videoEnabled, 
        audio: audioEnabled,
        tracks: this.localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
      });

      // Add tracks to peer connection if it exists
      if (this.peerConnection) {
        this.addTracksToConnection();
      }

      return this.localStream;
    } catch (error) {
      // Only log if it's not a permission denial (expected when user hasn't granted access yet)
      if (error instanceof Error && error.name !== 'NotAllowedError') {
        console.error('Error accessing media devices:', error);
      }
      throw error;
    }
  }

  private addTracksToConnection() {
    if (!this.peerConnection || !this.localStream) return;

    const senders = this.peerConnection.getSenders();

    this.localStream.getTracks().forEach((track) => {
      // Check if track is already added
      const existingSender = senders.find(sender => sender.track === track);
      if (!existingSender) {
        console.log(`Adding ${track.kind} track to connection`);
        this.peerConnection!.addTrack(track, this.localStream!);
      }
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    // Create offer with options to receive media even if we don't have local tracks yet
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    console.log('Created offer (ready to receive media)');
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log('Created answer');
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(description);
    console.log('Set remote description:', description.type);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(candidate);
    console.log('Added ICE candidate');
  }

  setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = enabled;
      });
      console.log('Video enabled:', enabled);
    }
  }

  setAudioEnabled(enabled: boolean) {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = enabled;
      });
      console.log('Audio enabled:', enabled);
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void) {
    this.onIceCandidateCallback = callback;
  }

  onConnectionState(callback: (state: RTCPeerConnectionState) => void) {
    this.onConnectionStateCallback = callback;
  }

  async close() {
    console.log('Closing WebRTC connection');
    
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
  }
}

// Helper to attach stream to video element
export function attachStreamToVideo(
  stream: MediaStream,
  videoRef: RefObject<HTMLVideoElement>
) {
  if (videoRef.current) {
    videoRef.current.srcObject = stream;
  }
}
