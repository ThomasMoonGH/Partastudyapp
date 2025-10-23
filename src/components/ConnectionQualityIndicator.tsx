import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ConnectionStats {
  bitrate: number; // kbps
  packetLoss: number; // percentage
  jitter: number; // ms
  latency: number; // ms
}

interface ConnectionQualityProps {
  peerConnection: RTCPeerConnection | null;
  enabled: boolean;
}

type QualityLevel = 'excellent' | 'good' | 'poor' | 'disconnected';

export function ConnectionQualityIndicator({ peerConnection, enabled }: ConnectionQualityProps) {
  const [quality, setQuality] = useState<QualityLevel>('disconnected');
  const [stats, setStats] = useState<ConnectionStats>({
    bitrate: 0,
    packetLoss: 0,
    jitter: 0,
    latency: 0,
  });

  useEffect(() => {
    if (!enabled || !peerConnection) {
      setQuality('disconnected');
      return;
    }

    let previousBytesReceived = 0;
    let previousTimestamp = 0;

    const checkConnectionQuality = async () => {
      try {
        const statsReport = await peerConnection.getStats();
        let currentStats: Partial<ConnectionStats> = {};

        statsReport.forEach((report) => {
          // Анализируем inbound-rtp статистику для аудио
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            // Вычисляем битрейт
            if (previousBytesReceived > 0 && previousTimestamp > 0) {
              const bytesDelta = (report.bytesReceived || 0) - previousBytesReceived;
              const timeDelta = report.timestamp - previousTimestamp;
              const bitrate = (bytesDelta * 8) / (timeDelta / 1000) / 1000; // kbps
              currentStats.bitrate = Math.round(bitrate);
            }
            previousBytesReceived = report.bytesReceived || 0;
            previousTimestamp = report.timestamp;

            // Packet loss
            if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
              const totalPackets = report.packetsLost + report.packetsReceived;
              currentStats.packetLoss = totalPackets > 0 
                ? (report.packetsLost / totalPackets) * 100 
                : 0;
            }

            // Jitter
            currentStats.jitter = report.jitter ? report.jitter * 1000 : 0; // convert to ms
          }

          // Анализируем candidate-pair для latency
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            currentStats.latency = report.currentRoundTripTime 
              ? report.currentRoundTripTime * 1000 
              : 0; // convert to ms
          }
        });

        // Обновляем статистику только если получили данные
        if (Object.keys(currentStats).length > 0) {
          setStats((prev) => ({
            bitrate: currentStats.bitrate ?? prev.bitrate,
            packetLoss: currentStats.packetLoss ?? prev.packetLoss,
            jitter: currentStats.jitter ?? prev.jitter,
            latency: currentStats.latency ?? prev.latency,
          }));
        }

        // Определяем качество соединения
        const newQuality = calculateQuality(
          currentStats.bitrate ?? stats.bitrate,
          currentStats.packetLoss ?? stats.packetLoss,
          currentStats.jitter ?? stats.jitter,
          currentStats.latency ?? stats.latency
        );
        setQuality(newQuality);
      } catch (error) {
        console.error('Error getting connection stats:', error);
      }
    };

    // Проверяем качество каждые 2 секунды
    const interval = setInterval(checkConnectionQuality, 2000);
    
    // Первая проверка сразу
    checkConnectionQuality();

    return () => clearInterval(interval);
  }, [enabled, peerConnection]);

  const calculateQuality = (
    bitrate: number,
    packetLoss: number,
    jitter: number,
    latency: number
  ): QualityLevel => {
    // Если нет битрейта - считаем отключенным
    if (bitrate === 0) return 'disconnected';

    // Критерии для аудио:
    // Excellent: packet loss < 1%, jitter < 30ms, latency < 150ms
    // Good: packet loss < 3%, jitter < 50ms, latency < 300ms
    // Poor: всё остальное

    if (packetLoss < 1 && jitter < 30 && latency < 150) {
      return 'excellent';
    } else if (packetLoss < 3 && jitter < 50 && latency < 300) {
      return 'good';
    } else {
      return 'poor';
    }
  };

  const getQualityConfig = (level: QualityLevel) => {
    switch (level) {
      case 'excellent':
        return {
          icon: Wifi,
          color: 'bg-green-500',
          text: 'Отлично',
          variant: 'default' as const,
        };
      case 'good':
        return {
          icon: Wifi,
          color: 'bg-yellow-500',
          text: 'Хорошо',
          variant: 'secondary' as const,
        };
      case 'poor':
        return {
          icon: Wifi,
          color: 'bg-red-500',
          text: 'Плохо',
          variant: 'destructive' as const,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'bg-gray-500',
          text: 'Нет связи',
          variant: 'outline' as const,
        };
    }
  };

  const config = getQualityConfig(quality);
  const Icon = config.icon;

  const tooltipContent = (
    <div className="text-sm space-y-1">
      <div className="font-medium">Статистика соединения:</div>
      <div>Битрейт: {stats.bitrate.toFixed(0)} kbps</div>
      <div>Потеря пакетов: {stats.packetLoss.toFixed(1)}%</div>
      <div>Jitter: {stats.jitter.toFixed(1)} ms</div>
      <div>Задержка: {stats.latency.toFixed(0)} ms</div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1.5 cursor-help">
            <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
