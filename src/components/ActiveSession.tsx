import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Heart,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { ChatPanel, Message } from "./ChatPanel";
import { ReportDialog } from "./ReportDialog";
import { ConnectionQualityIndicator } from "./ConnectionQualityIndicator";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { useLiveKit } from "../utils/useLiveKit";

interface ActiveSessionProps {
  sessionId: string;
  partnerName: string;
  partnerInitials?: string;
  isFavorite?: boolean;
  userEmail: string;
  onEndSession: () => void;
  onToggleFavorite?: () => void;
  onSendMessage: (message: string) => void;
  messages: Message[];
  onDemoPresenceChange?: (present: boolean) => void;
}

export function ActiveSession({ 
  sessionId, 
  partnerName,
  partnerInitials = "П",
  isFavorite = false,
  userEmail,
  onEndSession,
  onToggleFavorite,
  onSendMessage,
  messages,
  onDemoPresenceChange,
}: ActiveSessionProps) {
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [myMicEnabled, setMyMicEnabled] = useState(true);
  const [partnerMicEnabled, setPartnerMicEnabled] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [hasRemoteParticipant, setHasRemoteParticipant] = useState(false);
  
  // Auto-reconnect state (simplified for LiveKit)
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize LiveKit
  const {
    localStream,
    remoteStream,
    connectionState,
    isConnecting,
    isConnected,
    isVideoEnabled,
    isAudioEnabled,
    error: livekitError,
    mediaPermissionDenied,
    hasRequestedMedia,
    requestMediaAccess,
    toggleVideo: livekitToggleVideo,
    toggleAudio: livekitToggleAudio,
    peerConnection,
    reconnect,
    disconnect: livekitDisconnect,
  } = useLiveKit({
    sessionId,
    userId: userEmail,
    userName: userEmail.split('@')[0],
    enabled: true,
    autoStartMedia: false, // Don't auto-request media
  });

  // Attach local stream to video element
  useEffect(() => {
    console.log('🎥 Local stream changed:', localStream, 'videoEnabled:', videoEnabled);
    if (localStream && videoEnabled && localVideoRef.current) {
      console.log('🎥 Setting local video srcObject:', localStream);
      console.log('🎥 Video element:', localVideoRef.current);
      console.log('🎥 Stream tracks:', localStream.getTracks());
      console.log('🎥 Video tracks:', localStream.getVideoTracks());
      
      localVideoRef.current.srcObject = localStream;
      
      // Проверяем состояние после установки
      setTimeout(() => {
        if (localVideoRef.current) {
          console.log('🎥 Video srcObject after set:', localVideoRef.current.srcObject);
          console.log('🎥 Video readyState:', localVideoRef.current.readyState);
          console.log('🎥 Video paused:', localVideoRef.current.paused);
          console.log('🎥 Video currentTime:', localVideoRef.current.currentTime);
          
          // Попробуем запустить видео программно, если оно на паузе
          if (localVideoRef.current.paused) {
            console.log('🎥 Video is paused, trying to play...');
            localVideoRef.current.play().catch((error) => {
              console.error('🎥 Failed to play video:', error);
            });
          }
        }
      }, 100);
    }
  }, [localStream, videoEnabled]);

  // Синхронизируем состояние кнопок с LiveKit
  useEffect(() => {
    if (isConnected) {
      console.log('🔄 Syncing button states - isVideoEnabled:', isVideoEnabled, 'isAudioEnabled:', isAudioEnabled, 'localStream:', !!localStream);
      // Обновляем состояние кнопок на основе LiveKit
      // Видео включено только если есть и локальный поток, и трек включен в LiveKit
      setVideoEnabled(isVideoEnabled && !!localStream);
      setMyMicEnabled(isAudioEnabled);
      console.log('✅ Button states synced - videoEnabled:', isVideoEnabled && !!localStream, 'myMicEnabled:', isAudioEnabled);
    }
  }, [isConnected, isVideoEnabled, isAudioEnabled, localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Partner is connected, so assume mic is enabled
      setPartnerMicEnabled(true);
    }
  }, [remoteStream]);

  // Show LiveKit errors
  useEffect(() => {
    if (livekitError && !mediaPermissionDenied) {
      toast.error("Ошибка подключения", {
        description: livekitError.message || String(livekitError)
      });
    }
  }, [livekitError, mediaPermissionDenied]);

  // Show reconnection status
  useEffect(() => {
    if (isReconnecting) {
      toast.loading("Переподключение...", {
        description: `Попытка ${retryCount} из 5`,
        id: 'livekit-reconnect',
      });
    } else if (retryCount > 0 && connectionState === 'connected') {
      toast.success("Соединение восстановлено", {
        id: 'livekit-reconnect',
      });
    }
  }, [isReconnecting, retryCount, connectionState]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndSession = async () => {
    if (showEndConfirm) {
      try {
        await livekitDisconnect();
      } catch (error) {
        console.warn('Failed to disconnect LiveKit before ending session', error);
      }
      setShowEndConfirm(false);
      onEndSession();
    } else {
      setShowEndConfirm(true);
      setTimeout(() => setShowEndConfirm(false), 3000);
    }
  };

  const handleVideoToggle = async () => {
    console.log('🎥 Video toggle button clicked!');
    console.log('Current state - hasRequestedMedia:', hasRequestedMedia, 'videoEnabled:', videoEnabled, 'localStream:', !!localStream);
    
    // If no local stream, request media access first
    if (!localStream) {
      console.log('📹 No local stream, requesting media access...');
      await requestMediaAccess();
      console.log('📹 Media access requested, localStream:', !!localStream);
      return; // Exit after requesting media access
    }

    try {
      console.log('🔄 Toggling video, current state:', videoEnabled);
      await livekitToggleVideo();
      // Не обновляем состояние здесь - оно обновится через useEffect синхронизации
      console.log('✅ Video toggled, waiting for state sync...');
    } catch (error) {
      console.error('❌ Failed to toggle video:', error);
      toast.error('Не удалось переключить камеру');
    }
  };

  const handleMyMicToggle = async () => {
    // If media not requested yet, request it first
    if (!hasRequestedMedia) {
      await requestMediaAccess();
      // If successful, mic is already on
      setMyMicEnabled(true);
      return;
    }
    
    try {
      await livekitToggleAudio();
      // Не обновляем состояние здесь - оно обновится через useEffect синхронизации
      
      // If I turn off my mic, partner's mic also turns off (sync behavior)
      // Проверяем состояние после переключения
      setTimeout(() => {
        if (!isAudioEnabled) {
          setPartnerMicEnabled(false);
          toast.info("Микрофоны выключены", {
            description: "Оба участника должны включить микрофон для общения"
          });
        }
      }, 100);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Не удалось переключить микрофон');
    }
  };

  const handleReport = async (reason: string, details: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-85bbbe36/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            reporterEmail: userEmail,
            reportedUser: partnerName,
            reason,
            details,
          }),
        }
      );

      if (response.ok) {
        toast.success("Жалоба отправлена", {
          description: "Спасибо за ваше сообщение. Мы рассмотрим его."
        });
      } else {
        throw new Error("Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Ошибка отправки жалобы", {
        description: "Пожалуйста, попробуйте позже"
      });
    }
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite();
      toast.success(
        isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
        { description: isFavorite ? "" : "Теперь вы можете легко найти этого партнёра" }
      );
    }
  };

  // Can only speak if both mics are enabled and media access granted
  const canSpeak = myMicEnabled && partnerMicEnabled && hasRequestedMedia && !mediaPermissionDenied;
  const isDemoSession = sessionId.startsWith('demo');

  useEffect(() => {
    setHasRemoteParticipant(!!remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    if (isDemoSession && onDemoPresenceChange) {
      onDemoPresenceChange(hasRemoteParticipant);
    }
  }, [isDemoSession, hasRemoteParticipant, onDemoPresenceChange]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Сессия активна</span>
            </div>
            {isDemoSession && (
              <Badge variant="outline" className="bg-purple-600/20 border-purple-400 text-purple-200">
                <Sparkles className="w-3 h-3 mr-1" />
                ДЕМО-РЕЖИМ
              </Badge>
            )}
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{formatTime(elapsedTime)}</span>
            </div>
            <ConnectionQualityIndicator 
              peerConnection={peerConnection} 
              enabled={hasRequestedMedia}
            />
          </div>

          <Badge variant="outline" className="border-white/20 text-white">
            <User className="w-3 h-3 mr-1" />
            Учитесь с {partnerName}
          </Badge>
        </div>

        {isDemoSession && (
          <Card className={`mb-4 border ${hasRemoteParticipant ? 'bg-green-900/30 border-green-500/50 text-green-100' : 'bg-purple-900/30 border-purple-500/40 text-purple-100'}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                {hasRemoteParticipant ? (
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-300 flex-shrink-0" />
                ) : (
                  <Sparkles className="w-5 h-5 mt-0.5 text-purple-300 flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-semibold mb-1">
                    {hasRemoteParticipant ? "К вам подключился участник" : "Демо-комната открыта"}
                  </h3>
                  <p className="text-sm opacity-90">
                    {hasRemoteParticipant
                      ? "Можно начать совместное тестирование видеосвязи — всё готово!"
                      : "Чтобы второй участник подключился, откройте эту страницу во второй вкладке или отправьте ссылку коллеге."}
                  </p>
                </div>
              </div>
              {!hasRemoteParticipant && (
                <Button
                  variant="outline"
                  className="border-purple-300 text-purple-100 hover:bg-purple-800/60 hover:text-white"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.open(window.location.href, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Открыть вторую вкладку
                </Button>
              )}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                  {console.log('🎥 Video render check - videoEnabled:', videoEnabled, 'localStream:', !!localStream, 'condition:', videoEnabled && localStream)}
                  {videoEnabled && localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      onLoadedMetadata={() => console.log('🎥 Video metadata loaded')}
                      onCanPlay={() => console.log('🎥 Video can play')}
                      onPlay={() => console.log('🎥 Video started playing')}
                      onError={(e) => console.error('🎥 Video error:', e)}
                      style={{ border: '2px solid red' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Avatar className="w-24 h-24 mb-3">
                        <AvatarFallback className="text-2xl bg-blue-600">Вы</AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-gray-400">
                        {isConnecting 
                          ? "Подключение..." 
                          : !hasRequestedMedia 
                          ? "Ожидание разрешений"
                          : "Камера выключена"}
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Badge variant="secondary">Вы</Badge>
                    {myMicEnabled && canSpeak ? (
                      <Badge variant="default" className="bg-green-600">
                        <Mic className="w-3 h-3" />
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <MicOff className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                  {(connectionState === 'connecting' || connectionState === 'failed' || connectionState === 'disconnected') && (
                    <div className="absolute top-3 right-3">
                      <Badge 
                        variant="outline" 
                        className={
                          connectionState === 'failed' || connectionState === 'disconnected'
                            ? "border-red-400 text-red-400"
                            : "border-yellow-400 text-yellow-400"
                        }
                      >
                        {connectionState === 'connecting' ? '⏳ подключение' : 
                         connectionState === 'failed' ? '❌ ошибка' :
                         connectionState === 'disconnected' ? '⚠️ отключено' :
                         connectionState}
                      </Badge>
                    </div>
                  )}
                  {connectionState === 'connected' && hasRequestedMedia && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="border-green-400 text-green-400">
                        ✓ подключено
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Avatar className="w-24 h-24 mb-3">
                        <AvatarFallback className="text-2xl bg-purple-600">{partnerInitials}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-gray-400">{partnerName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {connectionState === 'connecting' ? 'Подключение...' : 
                         connectionState === 'connected' ? 'Камера выключена' : 
                         'Ожидание партнёра...'}
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Badge variant="secondary">{partnerName}</Badge>
                    {partnerMicEnabled && canSpeak ? (
                      <Badge variant="default" className="bg-green-600">
                        <Mic className="w-3 h-3" />
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <MicOff className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex justify-center gap-4 mb-6">
              <Button
                size="lg"
                variant={videoEnabled ? "default" : "secondary"}
                onClick={handleVideoToggle}
                className="w-16 h-16 rounded-full"
                title={!hasRequestedMedia ? "Сначала разрешите доступ к микрофону" : "Включить/выключить камеру"}
                disabled={mediaPermissionDenied}
              >
                {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>

              <Button
                size="lg"
                variant={myMicEnabled && canSpeak && hasRequestedMedia ? "default" : "secondary"}
                onClick={handleMyMicToggle}
                className="w-16 h-16 rounded-full"
                title={!hasRequestedMedia ? "Нажмите для доступа к микрофону" : canSpeak ? "Микрофоны включены" : "Оба участника должны включить микрофон"}
                disabled={mediaPermissionDenied}
              >
                {myMicEnabled && hasRequestedMedia ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                size="lg"
                variant="secondary"
                onClick={() => setShowChat(!showChat)}
                className="w-16 h-16 rounded-full lg:hidden"
                title="Чат"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>

              <Button
                size="lg"
                variant={showEndConfirm ? "default" : "destructive"}
                onClick={handleEndSession}
                className="w-16 h-16 rounded-full"
                title="Завершить сессию"
              >
                {showEndConfirm ? <CheckCircle2 className="w-6 h-6" /> : <PhoneOff className="w-6 h-6" />}
              </Button>
            </div>

            {showEndConfirm && (
              <div className="text-center mb-4">
                <p className="text-sm text-yellow-400">Нажмите ещё раз для подтверждения завершения сессии</p>
              </div>
            )}

            {!hasRequestedMedia && (
              <div className="mb-4 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                <div className="text-center mb-3">
                  <p className="text-blue-300 mb-1">
                    🎙️ Для голосового общения необходим доступ к микрофону
                  </p>
                  <p className="text-xs text-blue-400">
                    Нажмите кнопку ниже или кнопку микрофона для запроса разрешений
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={requestMediaAccess}
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Разрешить доступ к микрофону
                  </Button>
                </div>
              </div>
            )}

            {mediaPermissionDenied && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-600 rounded-lg text-center">
                <p className="text-sm text-red-300 mb-2">
                  {livekitError?.message || "Доступ к микрофону отклонён"}
                </p>
                <p className="text-xs text-red-400 mb-3">
                  Разрешите доступ в настройках браузера и попробуйте снова
                </p>
                <Button
                  onClick={() => {
                    window.location.reload();
                  }}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-300 hover:bg-red-900/20"
                >
                  Обновить страницу
                </Button>
              </div>
            )}

            {!canSpeak && hasRequestedMedia && !mediaPermissionDenied && (
              <div className="mb-4 p-3 bg-orange-900/30 border border-orange-600 rounded-lg text-center">
                <p className="text-sm text-orange-300">
                  {!myMicEnabled 
                    ? "Включите микрофон, чтобы общаться с партнёром"
                    : "Партнёр выключил микрофон. Оба должны включить микрофон для общения."}
                </p>
              </div>
            )}

            <Card className="bg-gray-800 border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3>Советы по обучению</h3>
                <div className="flex gap-2">
                  {onToggleFavorite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleFavorite}
                      className={isFavorite ? "text-red-400 hover:text-red-300" : "text-gray-400 hover:text-gray-300"}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                      {isFavorite ? "В избранном" : "В избранное"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReportDialog(true)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Пожаловаться
                  </Button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-white mb-1">Оставайтесь сосредоточенными</div>
                    <div className="text-gray-400">Работайте над своими задачами без отвлечений</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-white mb-1">Общайтесь при необходимости</div>
                    <div className="text-gray-400">Оба микрофона должны быть включены</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-white mb-1">Взаимная ответственность</div>
                    <div className="text-gray-400">Ваше присутствие помогает партнёру</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className={`${showChat ? 'block' : 'hidden lg:block'} h-[600px]`}>
            <ChatPanel
              messages={messages}
              onSendMessage={onSendMessage}
              partnerName={partnerName}
              partnerInitials={partnerInitials}
            />
          </div>
        </div>
      </div>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        partnerName={partnerName}
        onSubmit={handleReport}
      />
    </div>
  );
}
