import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, Clock, Video, Trash2, Users, MessageCircle, Heart, ChevronDown, ChevronUp, Sparkles, Info } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { ChatPanel, Message } from "./ChatPanel";

const DEMO_SESSION_ID = 'demo-room';

interface Session {
  id: string;
  date: Date;
  time: string;
  partner?: {
    name: string;
    initials: string;
  };
  status: 'upcoming' | 'waiting' | 'completed' | 'missed' | 'cancelled';
  isFavorite?: boolean;
  messages?: Message[];
  missedByUser?: boolean;
}

interface SessionsViewProps {
  sessions: Session[];
  onJoinSession: (sessionId: string) => void;
  onCancelSession: (sessionId: string) => void;
  onToggleFavorite?: (sessionId: string) => void;
  onSendMessage?: (sessionId: string, message: string) => void;
  openChatWithPartner?: string | null;
  onStartDemoCall?: () => void;
}

export function SessionsView({ 
  sessions, 
  onJoinSession, 
  onCancelSession,
  onToggleFavorite,
  onSendMessage,
  openChatWithPartner = null,
  onStartDemoCall
}: SessionsViewProps) {
  const [selectedChatSession, setSelectedChatSession] = useState<Session | null>(null);
  const [showUserMissedWarning, setShowUserMissedWarning] = useState(true);
  const [showPartnerMissedWarning, setShowPartnerMissedWarning] = useState(true);
  const demoSession = sessions.find(s => s.id === DEMO_SESSION_ID);
  
  // Update selected chat session when sessions change
  useEffect(() => {
    if (selectedChatSession) {
      const updatedSession = sessions.find(s => s.id === selectedChatSession.id);
      if (updatedSession) {
        setSelectedChatSession(updatedSession);
      }
    }
  }, [sessions]);

  // Auto-open chat if openChatWithPartner is provided
  useEffect(() => {
    if (openChatWithPartner) {
      const sessionWithPartner = sessions.find(s => s.partner?.name === openChatWithPartner);
      if (sessionWithPartner) {
        setSelectedChatSession(sessionWithPartner);
      }
    }
  }, [openChatWithPartner, sessions]);
  
  const upcomingSessions = sessions.filter(s => s.status === 'upcoming' || s.status === 'waiting');
  const pastSessions = sessions
    .filter(s => s.status === 'completed' || s.status === 'missed' || s.status === 'cancelled')
    .sort((a, b) => {
      // Сортировка от новых к старым
      const dateA = new Date(a.date);
      const [hoursA, minutesA] = a.time.split(':');
      dateA.setHours(parseInt(hoursA), parseInt(minutesA));
      
      const dateB = new Date(b.date);
      const [hoursB, minutesB] = b.time.split(':');
      dateB.setHours(parseInt(hoursB), parseInt(minutesB));
      
      return dateB.getTime() - dateA.getTime();
    });

  const isSessionActive = (session: Session) => {
    // Для тестирования - всегда показываем кнопку для upcoming сессий
    if (session.status === 'upcoming') {
      return true;
    }
    
    const now = new Date();
    const sessionDateTime = new Date(session.date);
    const [hours, minutes] = session.time.split(':');
    sessionDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    const diff = sessionDateTime.getTime() - now.getTime();
    const diffMinutes = diff / (1000 * 60);
    
    return diffMinutes <= 5 && diffMinutes >= -60;
  };

  const handleSendMessage = (text: string) => {
    if (selectedChatSession && onSendMessage) {
      onSendMessage(selectedChatSession.id, text);
    }
  };

  const SessionCard = ({ session, isPast = false }: { session: Session; isPast?: boolean }) => (
    <Card className={`p-6 ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-4 flex-1">
          <div className={`w-12 h-12 ${isPast ? 'bg-gray-100' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
            <Video className={`w-6 h-6 ${isPast ? 'text-gray-400' : 'text-blue-600'}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4>Учебная сессия</h4>
              {session.status === 'waiting' ? (
                <Badge variant="secondary">Ожидание партнёра</Badge>
              ) : session.status === 'upcoming' ? (
                <Badge variant="default">Подтверждена</Badge>
              ) : session.status === 'missed' ? (
                session.missedByUser ? (
                  <Badge variant="destructive" className="bg-orange-500">⚠️ Пропущена вами</Badge>
                ) : (
                  <Badge variant="destructive" className="bg-purple-500">⚠️ Партнёр не пришёл</Badge>
                )
              ) : session.status === 'cancelled' ? (
                <Badge variant="outline" className="text-gray-500">❌ Отменена</Badge>
              ) : (
                <Badge variant="outline">Завершена</Badge>
              )}
              {session.isFavorite && (
                <Badge variant="outline" className="text-red-500 border-red-500">
                  <Heart className="w-3 h-3 mr-1 fill-current" />
                  Избранное
                </Badge>
              )}
              {session.id.startsWith('demo') && (
                <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  ДЕМО
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {session.date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {session.time}
              </div>
            </div>

            {session.partner ? (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Партнёр по учёбе:</span>
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">{session.partner.initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{session.partner.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>Поиск партнёра по учёбе...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {!isPast && session.partner && onSendMessage && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedChatSession(session)}
              title="Открыть чат"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
          {isPast && session.partner && onSendMessage && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSelectedChatSession(session)}
              title="Открыть чат"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
          {session.partner && onToggleFavorite && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onToggleFavorite(session.id)}
              title={session.isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
              className={session.isFavorite ? "text-red-500 hover:text-red-600" : ""}
            >
              <Heart className={`w-4 h-4 ${session.isFavorite ? 'fill-current' : ''}`} />
            </Button>
          )}
          {!isPast && isSessionActive(session) ? (
            <Button onClick={() => {
              console.log('Joining session from SessionsView:', session.id);
              onJoinSession(session.id);
            }}>
              <Video className="w-4 h-4 mr-2" />
              Присоединиться
            </Button>
          ) : !isPast ? (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => onCancelSession(session.id)}
              title="Отменить сессию"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Мои учебные сессии</h2>
        <p className="text-gray-600">Управляйте предстоящими и прошлыми учебными сессиями</p>
      </div>

      {demoSession?.status === 'waiting' && (
        <Card className="p-5 mb-8 bg-purple-50 border-purple-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3 text-purple-900">
              <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Демо-созвон уже активен</h4>
                <p className="text-sm text-purple-800">
                  В комнате демо-созвона ожидает участник. Присоединитесь, чтобы протестировать видеосвязь вместе.
                  Можно открыть эту страницу во второй вкладке или отправить ссылку коллегe.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => onJoinSession(demoSession.id)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Присоединиться к демо
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(window.location.href, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                Открыть вторую вкладку
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-8">
        <div>
          <h3 className="mb-4">Предстоящие сессии</h3>
          {upcomingSessions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Нет предстоящих сессий</p>
                <p className="text-sm">Забронируйте временной слот, чтобы начать!</p>
              </div>
              {onStartDemoCall && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    Хотите протестировать видеосвязь?
                  </p>
                  <Button
                    onClick={onStartDemoCall}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Попробовать демо-созвон
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>

        {pastSessions.length > 0 && (
          <div>
            <h3 className="mb-4">Прошлые сессии</h3>
            
            {/* Предупреждение о пропущенных сессиях */}
            {pastSessions.some(s => s.status === 'missed') && (
              <div className="space-y-3 mb-4">
                {pastSessions.some(s => s.status === 'missed' && s.missedByUser) && (
                  <Card className="p-4 bg-orange-50 border-orange-200">
                    <div className="flex items-start gap-3">
                      <div className="text-orange-500 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <button
                          onClick={() => setShowUserMissedWarning(!showUserMissedWarning)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="mb-1 text-orange-900">Важно: пропущенные сессии</h4>
                            {showUserMissedWarning ? (
                              <ChevronUp className="w-4 h-4 text-orange-700 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-orange-700 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                        {showUserMissedWarning && (
                          <p className="text-sm text-orange-800 mt-2">
                            Если вы пропустите 3 сессии за месяц (не удалив их заранее), ваш аккаунт будет заблокирован. 
                            Пожалуйста, отменяйте сессии заранее, если не можете присутствовать.
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
                
                {pastSessions.some(s => s.status === 'missed' && !s.missedByUser) && (
                  <Card className="p-4 bg-purple-50 border-purple-200">
                    <div className="flex items-start gap-3">
                      <div className="text-purple-500 mt-0.5">⚠️</div>
                      <div className="flex-1">
                        <button
                          onClick={() => setShowPartnerMissedWarning(!showPartnerMissedWarning)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="mb-1 text-purple-900">Партнёр не пришёл на сессию</h4>
                            {showPartnerMissedWarning ? (
                              <ChevronUp className="w-4 h-4 text-purple-700 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-purple-700 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                        {showPartnerMissedWarning && (
                          <p className="text-sm text-purple-800 mt-2">
                            Ваш партнёр по учёбе не присоединился к сессии. Система зафиксировала пропуск, 
                            и виновник понесёт последствия — безнаказанности не будет. 
                            При накоплении 3 пропусков за месяц аккаунт блокируется автоматически.
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}
            
            <div className="grid gap-4">
              {pastSessions.map((session) => (
                <SessionCard key={session.id} session={session} isPast />
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedChatSession} onOpenChange={(open) => !open && setSelectedChatSession(null)}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Чат с {selectedChatSession?.partner?.name || "партнёром"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Переписка с партнёром по учёбе
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedChatSession && (
              <ChatPanel
                messages={selectedChatSession.messages || []}
                onSendMessage={handleSendMessage}
                partnerName={selectedChatSession.partner?.name || "партнёр"}
                partnerInitials={selectedChatSession.partner?.initials}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
