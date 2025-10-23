# WebRTC - Технические Заметки

## Архитектура без автозапроса медиа

### Проблема
Изначальная реализация запрашивала доступ к микрофону автоматически при инициализации WebRTC, что приводило к ошибке `NotAllowedError: Permission denied` если:
- Пользователь не ожидал запрос
- Браузер блокировал автоматические запросы
- Пользователь случайно отклонил

### Решение
Разделили процесс на две фазы:

#### Фаза 1: Установка соединения (без медиа)
```typescript
// 1. Создаём RTCPeerConnection
const webrtc = new WebRTCConnection(sessionId, userId);
await webrtc.initialize();

// 2. Создаём offer/answer БЕЗ локальных треков
const offer = await webrtc.createOffer({
  offerToReceiveAudio: true,  // Готовы принимать аудио
  offerToReceiveVideo: true,  // Готовы принимать видео
});

// 3. Обмениваемся SDP и ICE candidates
// Соединение установлено, но медиа ещё нет
```

#### Фаза 2: Добавление медиа (по запросу пользователя)
```typescript
// Пользователь нажимает кнопку "Разрешить доступ к микрофону"
const stream = await webrtc.startLocalStream(false, true);

// Добавляем треки к существующему соединению
webrtc.addTracksToConnection();

// Создаём новый offer для renegotiation
const newOffer = await webrtc.createOffer();

// Отправляем партнёру для обновления соединения
```

## Ключевые изменения

### 1. WebRTCConnection класс

**Метод `createOffer()` теперь с опциями:**
```typescript
const offer = await this.peerConnection.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
});
```
Это позволяет создавать offer даже без локальных треков, но с готовностью принимать медиа от партнёра.

**Новый метод `addTracksToConnection()`:**
```typescript
private addTracksToConnection() {
  if (!this.peerConnection || !this.localStream) return;
  
  const senders = this.peerConnection.getSenders();
  
  this.localStream.getTracks().forEach((track) => {
    // Проверяем, не добавлен ли трек уже
    const existingSender = senders.find(sender => sender.track === track);
    if (!existingSender) {
      this.peerConnection!.addTrack(track, this.localStream!);
    }
  });
}
```
Предотвращает дублирование треков при повторном добавлении.

**Проверка в `startLocalStream()`:**
```typescript
// Не запрашиваем снова, если уже есть
if (this.localStream) {
  console.log('Local stream already exists');
  return this.localStream;
}
```

### 2. useWebRTC хук

**Параметр `autoStartMedia`:**
```typescript
interface UseWebRTCProps {
  sessionId: string;
  userId: string;
  userName: string;
  enabled: boolean;
  autoStartMedia?: boolean; // false по умолчанию
}
```

**Явный метод `requestMediaAccess()`:**
```typescript
const requestMediaAccess = useCallback(async () => {
  // Проверяем, не запрошено ли уже
  if (hasRequestedMedia) return true;
  
  if (!webrtcRef.current) return false;
  
  // Запрашиваем разрешение
  const stream = await webrtcRef.current.startLocalStream(false, true);
  
  // Если уже есть партнёр - делаем renegotiation
  if (partnerUserIdRef.current) {
    const offer = await webrtcRef.current.createOffer();
    await sendOffer(offer);
  }
  
  return true;
}, [hasRequestedMedia, sessionId, userId, serverUrl]);
```

**Логика инициализации:**
```typescript
// Создаём соединение
const webrtc = new WebRTCConnection(sessionId, userId);
await webrtc.initialize();

webrtcRef.current = webrtc;

// НЕ запрашиваем медиа автоматически!
if (autoStartMedia) { // false в нашем случае
  await requestMediaAccess();
}

// Создаём offer БЕЗ медиа
if (participants.length > 0) {
  const offer = await webrtc.createOffer();
  await sendOffer(offer);
}
```

### 3. ActiveSession компонент

**Передаём `autoStartMedia: false`:**
```typescript
const {
  localStream,
  remoteStream,
  requestMediaAccess,
  ...
} = useWebRTC({
  sessionId,
  userId: userEmail,
  userName: userEmail.split('@')[0],
  enabled: true,
  autoStartMedia: false, // Явно отключаем автозапрос
});
```

**Кнопки вызывают явный запрос:**
```typescript
const handleMyMicToggle = async () => {
  if (!hasRequestedMedia) {
    const success = await requestMediaAccess();
    if (!success) return;
    setMyMicEnabled(true);
    return;
  }
  
  // Обычное переключение
  const newState = !myMicEnabled;
  setMyMicEnabled(newState);
  webrtcToggleAudio(newState);
};
```

## Диаграмма последовательности

### Сценарий 1: Оба пользователя разрешают доступ

```
User A                    Server                    User B
  |                         |                         |
  |-- Join Session -------->|<------- Join Session ---|
  |<-- Participants: [B] ---|                         |
  |                         |--- Participants: [A] -->|
  |                         |                         |
  |-- Create Offer -------->|                         |
  |   (no media yet)        |                         |
  |                         |                         |
  |                         |<------- Poll Offer -----|
  |                         |---- Offer ------------->|
  |                         |                         |
  |                         |<------- Answer ---------|
  |<------- Poll Answer ----|                         |
  |                         |                         |
  |<==== ICE Candidates ============================>|
  |     (P2P Connection established)                  |
  |                         |                         |
[User A clicks "Allow Mic"]                           |
  |                         |                         |
  |-- getUserMedia() ------>|                         |
  |<-- MediaStream ---------|                         |
  |                         |                         |
  |-- Renegotiate Offer --->|                         |
  |   (with audio track)    |                         |
  |                         |<------- Poll Offer -----|
  |                         |---- Offer ------------->|
  |                         |<------- Answer ---------|
  |<------- Poll Answer ----|                         |
  |                         |                         |
  |                         |         [User B clicks "Allow Mic"]
  |                         |<------- getUserMedia() --|
  |                         |---- MediaStream ------->|
  |                         |                         |
  |                         |<--- Renegotiate Offer --|
  |<------- Poll Offer -----|                         |
  |-- Answer --------------->|---- Answer ----------->|
  |                         |                         |
  |<======== AUDIO FLOWS BOTH WAYS ==================>|
```

### Сценарий 2: Работа только с текстовым чатом

```
User A                    Server                    User B
  |                         |                         |
  |-- Join Session -------->|<------- Join Session ---|
  |<-- Participants: [B] ---|                         |
  |                         |--- Participants: [A] -->|
  |                         |                         |
  |-- Create Offer -------->|                         |
  |   (no media)            |                         |
  |                         |<------- Poll Offer -----|
  |                         |---- Offer ------------->|
  |                         |<------- Answer ---------|
  |<------- Poll Answer ----|                         |
  |                         |                         |
  |<==== P2P Connection ================================>|
  |     (for chat only, no media requested)           |
  |                         |                         |
  |<======== TEXT CHAT MESSAGES ======================>|
```

## Преимущества новой архитектуры

### ✅ Лучший UX
- Нет неожиданных запросов разрешений
- Пользователь контролирует процесс
- Понятные индикаторы и кнопки
- Можно работать без микрофона

### ✅ Меньше ошибок
- Нет `NotAllowedError` при загрузке
- Graceful degradation (чат работает всегда)
- Возможность retry при ошибке
- Лучшая обработка отказа

### ✅ Более гибкая система
- Renegotiation для добавления медиа
- Можно добавить видео позже
- Можно работать только с аудио
- Можно работать только с текстом

### ✅ Соответствие best practices
- User gesture required (как требует браузер)
- Progressive enhancement
- Defensive programming
- Clear separation of concerns

## Известные ограничения

### Polling вместо WebSocket
- Проверка offer/answer каждые 2 секунды
- Может быть задержка до 2 секунд при подключении
- Больше запросов к серверу

**Почему:** Supabase KV Store не поддерживает pub/sub. Для production лучше использовать Supabase Realtime.

### Только 2 участника
- Peer-to-peer архитектура
- Для групповых звонков нужен SFU/MCU

**Почему:** P2P проще для MVP. Для production с группами нужен медиа-сервер.

### Нет TURN сервера
- Может не работать в строгих корпоративных сетях
- Symmetric NAT может блокировать

**Почему:** TURN серверы платные. Для production стоит добавить.

## Будущие улучшения

### High Priority
- [ ] Supabase Realtime вместо polling
- [ ] TURN сервер для сложных сетей
- [ ] Автоматическое переподключение при разрыве

### Medium Priority
- [ ] Perfect negotiation pattern (вместо offer/answer polling)
- [ ] Индикатор качества соединения
- [ ] Адаптивный битрейт

### Low Priority
- [ ] SFU для групповых звонков
- [ ] Запись сессий
- [ ] Статистика (getStats())

## Отладка

### Логи при нормальной работе
```
Initializing WebRTC connection...
Other participants: []
Created offer (ready to receive media)
Polling for offers...
[User clicks button]
Requesting media access...
Local stream started: { video: false, audio: true, tracks: [...] }
Media access granted
Renegotiating connection with new media tracks...
Created offer (ready to receive media)
Sent renegotiation offer to partner
Connection state: connected
Received remote stream
```

### Частые проблемы

**"Error accessing media devices: NotAllowedError"**
- ОЖИДАЕМО если пользователь отклонил разрешение
- Показываем красную панель с кнопкой "Обновить"
- НЕ показываем при загрузке (нет автозапроса)

**"Connection state: failed"**
- Проблемы с сетью
- Нужен TURN сервер
- Проверить firewall

**"No remote stream"**
- Партнёр не разрешил доступ к микрофону
- Партнёр ещё не подключился
- Ждём renegotiation

## Ссылки

- [WebRTC Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)
- [RTCPeerConnection.createOffer()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)
- [Adding tracks after connection](https://webrtc.org/getting-started/media-devices#adding-tracks)
- [getUserMedia best practices](https://web.dev/getusermedia-intro/)
