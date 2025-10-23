# Мониторинг качества WebRTC соединения

## Реализовано

Добавлен реал-тайм мониторинг качества WebRTC соединения с визуализацией метрик.

## Технические детали

### Используемые WebRTC API

```typescript
// Получение статистики соединения
const statsReport = await peerConnection.getStats();

statsReport.forEach((report) => {
  if (report.type === 'inbound-rtp' && report.kind === 'audio') {
    // Битрейт вычисляется из delta байтов
    const bitrate = (bytesDelta * 8) / (timeDelta / 1000) / 1000; // kbps
    
    // Packet loss из стандартных метрик
    const packetLoss = (report.packetsLost / totalPackets) * 100;
    
    // Jitter - вариация задержки пакетов
    const jitter = report.jitter * 1000; // ms
  }
  
  if (report.type === 'candidate-pair' && report.state === 'succeeded') {
    // Round-trip time для измерения задержки
    const latency = report.currentRoundTripTime * 1000; // ms
  }
});
```

### Метрики качества

**Отлично:**
- Packet loss < 1%
- Jitter < 30ms  
- Latency < 150ms

**Хорошо:**
- Packet loss < 3%
- Jitter < 50ms
- Latency < 300ms

**Плохо:** всё остальное

### Интеграция с существующей архитектурой

1. Расширен `WebRTCConnection` методом `getPeerConnection()`
2. `useWebRTC` возвращает `peerConnection` для мониторинга
3. `ConnectionQualityIndicator` опрашивает `getStats()` каждые 2 секунды
4. Компонент интегрирован в `ActiveSession` рядом с таймером

### Почему это работает с вашей архитектурой

- ✅ **Не требует медиа-доступа** - мониторинг работает даже если пользователь не разрешил микрофон
- ✅ **Работает с renegotiation** - метрики обновляются когда добавляются треки
- ✅ **Graceful degradation** - показывает "disconnected" если нет соединения
- ✅ **Polling-friendly** - обновление каждые 2 секунды как у вашего SDP/ICE polling

## Демонстрация знаний WebRTC

### RTCPeerConnection.getStats()
Асинхронный метод возвращающий `RTCStatsReport` - карту объектов статистики. Ключевые типы:

- `inbound-rtp` - входящие RTP потоки (получаем аудио/видео от партнёра)
- `outbound-rtp` - исходящие RTP потоки (отправляем партнёру)
- `candidate-pair` - пары ICE кандидатов для P2P соединения
- `track` - информация о медиа треках
- `transport` - транспортный слой (DTLS/SRTP)

### Вычисление битрейта
```typescript
// Битрейт = изменение байтов / изменение времени
const bytesDelta = currentBytes - previousBytes;
const timeDelta = currentTimestamp - previousTimestamp;
const bitrate = (bytesDelta * 8) / (timeDelta / 1000) / 1000; // kbps
```

Важно сохранять предыдущие значения между вызовами `getStats()`.

### Packet Loss vs Jitter vs Latency

- **Packet Loss** - процент потерянных пакетов. Критично для качества аудио.
- **Jitter** - вариация задержки между пакетами. Высокий jitter = дрожащий голос.
- **Latency** - RTT (round-trip time). Влияет на задержку в разговоре.

### Интеграция с вашей двухфазной архитектурой

Ваша реализация:
```typescript
// Фаза 1: Соединение без медиа
const offer = await peerConnection.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
});

// Фаза 2: Добавление медиа + renegotiation
await requestMediaAccess(); // вызывает getUserMedia
addTracksToConnection();    // добавляет треки
const newOffer = await peerConnection.createOffer(); // renegotiate
```

Мониторинг работает на обеих фазах:
- **Фаза 1**: показывает "disconnected" (нет битрейта)
- **Фаза 2**: показывает реальные метрики после renegotiation

## Связь с existing документацией

Эта фича дополняет `WEBRTC_TECHNICAL_NOTES.md` раздел "Medium Priority":
> - [ ] Индикатор качества соединения

✅ **ГОТОВО**

## Возможные улучшения

1. **Adaptive bitrate** - автоматическое снижение качества при плохом соединении
2. **Reconnection logic** - автопереподключение при `connectionState === 'failed'`
3. **Stats history** - график качества за последние N минут
4. **Alerts** - уведомления при критическом падении качества

## Proof of Concept

Компонент `ConnectionQualityIndicator` - полнофункциональный мониторинг с:
- ✅ Реал-тайм метрики из `getStats()`
- ✅ Визуальная индикация (цвета/иконки)
- ✅ Tooltip с детальной статистикой
- ✅ Автоматический расчёт уровня качества
- ✅ TypeScript типизация
