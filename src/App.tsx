import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { CalendarView } from "./components/CalendarView";
import { SessionsView } from "./components/SessionsView";
import { ActiveSession } from "./components/ActiveSession";
import { AuthView } from "./components/AuthView";
import { ProfileView } from "./components/ProfileView";
import { AdminView } from "./components/AdminView";
import { FavoritesView } from "./components/FavoritesView";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner@2.0.3";
import { Button } from "./components/ui/button";
import { Message } from "./components/ChatPanel";

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
  messages: Message[];
  missedByUser?: boolean; // true если пользователь пропустил сессию
}

interface User {
  name: string;
  email: string;
  avatar?: string;
  favoritePartners: string[]; // partner names
  isAdmin?: boolean;
  isBlocked?: boolean;
  missedSessions?: Array<{ sessionId: string; date: Date }>; // история пропусков
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'calendar' | 'sessions' | 'active' | 'profile' | 'admin' | 'favorites'>('calendar');
  const [openChatWithPartner, setOpenChatWithPartner] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 'demo-session',
      date: new Date(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      partner: { name: 'Мария Иванова', initials: 'МИ' },
      status: 'upcoming',
      isFavorite: false,
      messages: [
        {
          id: '1',
          sender: 'partner',
          text: 'Привет! Готов начать учиться?',
          timestamp: new Date(Date.now() - 120000)
        }
      ]
    },
    {
      id: '1',
      date: new Date(2025, 9, 23),
      time: '14:00',
      partner: { name: 'Сара Чен', initials: 'СЧ' },
      status: 'upcoming',
      isFavorite: true,
      messages: []
    },
    {
      id: '2',
      date: new Date(2025, 9, 18),
      time: '10:00',
      partner: { name: 'Алекс Кумар', initials: 'АК' },
      status: 'completed',
      isFavorite: false,
      messages: [
        {
          id: '1',
          sender: 'partner',
          text: 'Спасибо за сессию!',
          timestamp: new Date(2025, 9, 18, 11, 30)
        },
        {
          id: '2',
          sender: 'user',
          text: 'Было здорово учиться вместе!',
          timestamp: new Date(2025, 9, 18, 11, 32)
        }
      ]
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Check for saved user in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('parta_user');
    let currentUser = null;
    
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Migrate old users without favoritePartners
      if (!parsedUser.favoritePartners) {
        parsedUser.favoritePartners = [];
      }
      // Check if user is admin
      if (!parsedUser.hasOwnProperty('isAdmin')) {
        parsedUser.isAdmin = parsedUser.email === 'admin@parta.app' || parsedUser.email === 'tpycbi@gmail.com';
      }
      // Migrate old users without missedSessions
      if (!parsedUser.missedSessions) {
        parsedUser.missedSessions = [];
      }
      // Migrate old users without isBlocked
      if (!parsedUser.hasOwnProperty('isBlocked')) {
        parsedUser.isBlocked = false;
      }
      // Convert missedSessions dates from strings to Date objects
      if (parsedUser.missedSessions) {
        parsedUser.missedSessions = parsedUser.missedSessions.map((m: any) => ({
          ...m,
          date: new Date(m.date)
        }));
      }
      currentUser = parsedUser;
      setUser(parsedUser);
      // Save migrated user back to localStorage
      localStorage.setItem('parta_user', JSON.stringify(parsedUser));
    }
    
    // Добавляем тестовые сессии для демонстрации
    const testMissedSessionByUser: Session = {
      id: 'missed-test-1',
      date: new Date(2025, 9, 21), // 21 октября 2025
      time: '17:50',
      partner: {
        name: 'Алексей Петров',
        initials: 'АП'
      },
      status: 'missed',
      isFavorite: false,
      messages: [],
      missedByUser: true
    };

    const testMissedSessionByPartner: Session = {
      id: 'missed-test-2',
      date: new Date(2025, 9, 20), // 20 октября 2025
      time: '14:00',
      partner: {
        name: 'Мария Сидорова',
        initials: 'МС'
      },
      status: 'missed',
      isFavorite: false,
      messages: [],
      missedByUser: false
    };

    const testCancelledSession: Session = {
      id: 'cancelled-test-1',
      date: new Date(2025, 9, 19), // 19 октября 2025
      time: '10:30',
      partner: {
        name: 'Иван Иванов',
        initials: 'ИИ'
      },
      status: 'cancelled',
      isFavorite: false,
      messages: [],
      missedByUser: false
    };

    const savedSessions = localStorage.getItem('parta_sessions');
    let loadedSessions: Session[] = [];
    
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      // Convert date strings back to Date objects
      const sessionsWithDates = parsed.map((s: any) => ({
        ...s,
        date: new Date(s.date),
        messages: s.messages?.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })) || []
      }));
      
      // Синхронизируем isFavorite с user.favoritePartners
      if (currentUser) {
        loadedSessions = sessionsWithDates.map((s: Session) => ({
          ...s,
          isFavorite: s.partner ? currentUser.favoritePartners.includes(s.partner.name) : false
        }));
      } else {
        loadedSessions = sessionsWithDates;
      }
    }
    
    // Добавляем тестовые сессии, если их ещё нет
    const testSessions = [testMissedSessionByUser, testMissedSessionByPartner, testCancelledSession];
    
    for (const testSession of testSessions) {
      const hasTestSession = loadedSessions.some(s => s.id === testSession.id);
      if (!hasTestSession) {
        loadedSessions = [testSession, ...loadedSessions];
        
        // Добавляем пропуск в профиль пользователя только для сессий, пропущенных пользователем
        if (testSession.status === 'missed' && testSession.missedByUser && currentUser) {
          const hasTestMissedRecord = currentUser.missedSessions?.some(m => m.sessionId === testSession.id);
          if (!hasTestMissedRecord) {
            const updatedUser = {
              ...currentUser,
              missedSessions: [
                ...(currentUser.missedSessions || []),
                {
                  sessionId: testSession.id,
                  date: testSession.date
                }
              ]
            };
            currentUser = updatedUser;
            setUser(updatedUser);
            localStorage.setItem('parta_user', JSON.stringify(updatedUser));
          }
        }
      }
    }
    
    setSessions(loadedSessions);
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('parta_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Автоматически помечать пропущенные сессии и блокировать при 3 пропусках
  useEffect(() => {
    const checkExpiredSessions = () => {
      const now = new Date();
      let missedCount = 0;
      const newlyMissedSessions: Array<{ sessionId: string; date: Date }> = [];
      
      setSessions(prev => {
        const updated = prev.map(session => {
          // Пропускаем уже завершённые, пропущенные или отменённые сессии
          if (session.status === 'completed' || session.status === 'missed' || session.status === 'cancelled') return session;
          
          // Вычисляем дату и время сессии
          const sessionDateTime = new Date(session.date);
          const [hours, minutes] = session.time.split(':');
          sessionDateTime.setHours(parseInt(hours), parseInt(minutes));
          
          // Добавляем 1 час на длительность сессии
          const sessionEndTime = new Date(sessionDateTime.getTime() + 60 * 60 * 1000);
          
          // Если сессия закончилась, помечаем как пропущенную
          if (sessionEndTime < now) {
            missedCount++;
            newlyMissedSessions.push({
              sessionId: session.id,
              date: session.date
            });
            return { ...session, status: 'missed' as const, missedByUser: true };
          }
          
          return session;
        });
        
        // Обновляем информацию о пропусках пользователя
        if (missedCount > 0 && user) {
          const updatedMissedSessions = [
            ...(user.missedSessions || []),
            ...newlyMissedSessions
          ];
          
          // Считаем пропуски за последний месяц
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          
          const missedInLastMonth = updatedMissedSessions.filter(m => 
            new Date(m.date) >= oneMonthAgo
          );
          
          const missedThisMonth = missedInLastMonth.length;
          
          // Обновляем пользователя
          const updatedUser = {
            ...user,
            missedSessions: updatedMissedSessions,
            isBlocked: missedThisMonth >= 3
          };
          
          setUser(updatedUser);
          localStorage.setItem('parta_user', JSON.stringify(updatedUser));
          
          // Показываем предупреждения
          if (missedThisMonth >= 3) {
            toast.error('Вы заблокированы!', {
              description: `У вас ${missedThisMonth} пропущенных сессий за месяц. Вы не можете бронировать новые сессии.`,
              duration: 10000
            });
          } else if (missedThisMonth === 2) {
            toast('⚠️ Последнее предупреждение!', {
              description: `У вас ${missedThisMonth} пропус��а за месяц. Ещё один пропуск - и вы будете заблокированы!`,
              duration: 8000,
              style: {
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                color: '#92400E'
              }
            });
          } else if (missedThisMonth === 1) {
            toast('⚠️ Предупреждение о пропуске', {
              description: `У вас ${missedCount} ${missedCount === 1 ? 'пропуск' : 'пропуска'} сессии. При 3 пропусках за месяц вы будете заблокированы.`,
              duration: 7000,
              style: {
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                color: '#92400E'
              }
            });
          }
          
          if (missedCount > 0) {
            toast.info(`Пропущенные сессии отмечены`, {
              description: `${missedCount} ${missedCount === 1 ? 'сессия' : missedCount < 5 ? 'сессии' : 'сессий'} помечены как пропущенные`
            });
          }
        }
        
        return updated;
      });
    };
    
    // Проверяем при загрузке (с задержкой чтобы пользователь успел авторизоваться)
    if (user) {
      setTimeout(checkExpiredSessions, 500);
    }
    
    // Проверяем каждую минуту
    const interval = setInterval(checkExpiredSessions, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (name: string, email: string) => {
    const isAdmin = email === 'admin@parta.app' || email === 'tpycbi@gmail.com';
    const newUser = { 
      name, 
      email, 
      favoritePartners: [], 
      isAdmin,
      isBlocked: false,
      missedSessions: []
    };
    setUser(newUser);
    localStorage.setItem('parta_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('parta_user');
    toast.info("Вы вышли из аккаунта");
  };

  const handleUpdateProfile = (name: string, avatar?: string) => {
    if (user) {
      const updatedUser = { ...user, name, avatar };
      setUser(updatedUser);
      localStorage.setItem('parta_user', JSON.stringify(updatedUser));
    }
  };

  const handleBookSession = (date: Date, time: string) => {
    // Проверяем, не заблокирован ли пользователь
    if (user?.isBlocked) {
      toast('🚫 Бронирование недоступно', {
        description: 'Вы заблокированы из-за пропущенных сессий. Свяжитесь с поддержкой.',
        duration: 7000,
        style: {
          background: '#FEF3C7',
          border: '1px solid #F59E0B',
          color: '#92400E'
        }
      });
      return;
    }

    const newSession: Session = {
      id: Date.now().toString(),
      date,
      time,
      status: 'waiting',
      isFavorite: false,
      messages: [],
      missedByUser: false
    };

    setSessions([...sessions, newSession]);
    
    toast.success("Сессия забронирована!", {
      description: "Вы будете уведомлены, когда партнёр присоединится."
    });

    // Simulate finding a partner after 2 seconds
    setTimeout(() => {
      setSessions(prev => prev.map(s => 
        s.id === newSession.id 
          ? { 
              ...s, 
              status: 'upcoming' as const,
              partner: { 
                name: ['Эмма Уилсон', 'Джеймс Парк', 'София Родригес', 'Лиам Браун'][Math.floor(Math.random() * 4)],
                initials: ['ЭУ', 'ДП', 'СР', 'ЛБ'][Math.floor(Math.random() * 4)]
              }
            }
          : s
      ));
      toast.success("Партнёр найден!", {
        description: "Вы были сопоставлены с партнёром по учёбе."
      });
    }, 2000);

    setCurrentView('sessions');
  };

  const handleJoinSession = (sessionId: string) => {
    console.log('Joining session:', sessionId);
    console.log('Available sessions:', sessions);
    setActiveSessionId(sessionId);
    setCurrentView('active');
  };

  const handleCancelSession = (sessionId: string) => {
    setSessions(sessions.map(s => 
      s.id === sessionId ? { ...s, status: 'cancelled' as const } : s
    ));
    toast.info("Сессия отменена", {
      description: "Ваша учебная сессия была отменена и перемещена в историю."
    });
  };

  const handleEndSession = () => {
    if (activeSessionId) {
      setSessions(sessions.map(s => 
        s.id === activeSessionId ? { ...s, status: 'completed' as const } : s
      ));
      toast.success("Сессия завершена!", {
        description: "Отличная работа! До встречи!"
      });
    }
    setActiveSessionId(null);
    setCurrentView('sessions');
  };

  const handleToggleFavorite = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.partner || !user) return;
    
    const partnerName = session.partner.name;
    const newFavoriteStatus = !session.isFavorite;
    
    // Обновляем список избранных партнеров пользователя
    const updatedUser = {
      ...user,
      favoritePartners: newFavoriteStatus
        ? [...new Set([...user.favoritePartners, partnerName])] // Use Set to avoid duplicates
        : user.favoritePartners.filter(name => name !== partnerName)
    };
    
    // console.log('Toggle favorite:', { partnerName, newFavoriteStatus, favoritePartners: updatedUser.favoritePartners });
    
    setUser(updatedUser);
    localStorage.setItem('parta_user', JSON.stringify(updatedUser));
    
    // Обновляем сессию
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, isFavorite: newFavoriteStatus } : s
    ));
  };

  const handleRemoveFavorite = (partnerName: string) => {
    if (user) {
      const updatedUser = {
        ...user,
        favoritePartners: user.favoritePartners.filter(name => name !== partnerName)
      };
      
      // console.log('Remove favorite:', { partnerName, favoritePartners: updatedUser.favoritePartners });
      
      setUser(updatedUser);
      localStorage.setItem('parta_user', JSON.stringify(updatedUser));
      
      // Also update sessions
      setSessions(prev => prev.map(s => 
        s.partner?.name === partnerName ? { ...s, isFavorite: false } : s
      ));
      
      toast.info("Удалено из избранного");
    }
  };

  const handleOpenChatFromFavorites = (partnerName: string) => {
    // Find a session with this partner
    const sessionWithPartner = sessions.find(s => s.partner?.name === partnerName);
    
    if (sessionWithPartner) {
      // Navigate to sessions view and open chat
      setOpenChatWithPartner(partnerName);
      setCurrentView('sessions');
      toast.success(`Открываем чат с ${partnerName}`);
    } else {
      toast.info("Нет сессий с этим партнёром", {
        description: "Забронируйте новую сессию, чтобы начать общение"
      });
    }
  };

  const handleSendMessage = (sessionId: string, messageText: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'user',
          text: messageText,
          timestamp: new Date()
        };
        
        const updatedMessages = [...s.messages, newMessage];
        
        // Simulate partner response after a delay (only for active sessions)
        if (sessionId === activeSessionId && Math.random() > 0.5) {
          setTimeout(() => {
            setSessions(prev2 => prev2.map(s2 => {
              if (s2.id === sessionId) {
                const responses = [
                  "Понял, спасибо!",
                  "Отлично, продолжай!",
                  "Да, согласен",
                  "Хорошо сказано!",
                  "Интересная мысль"
                ];
                const partnerMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  sender: 'partner',
                  text: responses[Math.floor(Math.random() * responses.length)],
                  timestamp: new Date()
                };
                return {
                  ...s2,
                  messages: [...s2.messages, partnerMessage]
                };
              }
              return s2;
            }));
          }, 1000 + Math.random() * 2000);
        }
        
        return {
          ...s,
          messages: updatedMessages
        };
      }
      return s;
    }));
  };

  const handleDemoPresenceChange = (present: boolean) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === DEMO_SESSION_ID
          ? { ...s, status: present ? ('upcoming' as const) : ('waiting' as const) }
          : s
      )
    );
  };

  const handleStartDemoCall = () => {
    // Проверяем, есть ли уже демо-сессия в списке
    const existingDemo = sessions.find(s => s.id === DEMO_SESSION_ID);
    if (existingDemo) {
      toast.info('Подключаемся к демо-созвону', {
        description: 'В этой комнате уже может ожидать участник — подключаем вас к нему.'
      });
      setActiveSessionId(DEMO_SESSION_ID);
      setCurrentView('active');
      return;
    }

    // Создаём демо-сессию, которая начинается прямо сейчас
    const now = new Date();
    const demoSession: Session = {
      id: DEMO_SESSION_ID,
      date: now,
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false }),
      partner: { 
        name: 'Демо-партнёр', 
        initials: 'ДП' 
      },
      status: 'waiting',
      isFavorite: false,
      messages: [
        {
          id: '1',
          sender: 'partner',
          text: 'Привет! Это демо-режим. Можете протестировать все функции видеосвязи!',
          timestamp: new Date()
        }
      ],
      missedByUser: false
    };

    setSessions(prev => [demoSession, ...prev.filter(s => s.id !== DEMO_SESSION_ID)]);
    
    toast.success('Демо-сессия создана!', {
      description: 'Подключаемся к демо-созвону...'
    });

    // Подключаемся к сессии через небольшую задержку
    setTimeout(() => {
      setActiveSessionId(demoSession.id);
      setCurrentView('active');
    }, 500);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  
  // Debug logging
  useEffect(() => {
    // keep hook for potential side-effects; no logging needed in production
  }, [currentView, activeSessionId, activeSession, sessions]);

  // Reset openChatWithPartner when leaving sessions view
  useEffect(() => {
    if (currentView !== 'sessions') {
      setOpenChatWithPartner(null);
    }
  }, [currentView]);

  // Show auth view if not logged in
  if (!user) {
    return (
      <>
        <AuthView onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  const userInitials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView !== 'active' && (
        <Header 
          currentView={currentView} 
          onViewChange={setCurrentView}
          userName={user.name}
          userInitials={userInitials}
          userAvatar={user.avatar}
          onLogout={handleLogout}
          isAdmin={user.isAdmin}
        />
      )}

      {currentView === 'calendar' && (
        <CalendarView 
          onBookSession={handleBookSession}
          sessions={sessions}
          onStartDemoCall={handleStartDemoCall}
        />
      )}

      {currentView === 'sessions' && (
        <SessionsView 
          sessions={sessions}
          onJoinSession={handleJoinSession}
          onCancelSession={handleCancelSession}
          onToggleFavorite={handleToggleFavorite}
          onSendMessage={handleSendMessage}
          openChatWithPartner={openChatWithPartner}
          onStartDemoCall={handleStartDemoCall}
        />
      )}

      {currentView === 'profile' && (
        <ProfileView
          userName={user.name}
          userEmail={user.email}
          userAvatar={user.avatar}
          favoritePartners={user.favoritePartners}
          missedSessions={user.missedSessions}
          isBlocked={user.isBlocked}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {currentView === 'admin' && user.isAdmin && (
        <AdminView />
      )}

      {currentView === 'favorites' && (
        <FavoritesView
          favoritePartners={user.favoritePartners}
          onRemoveFavorite={handleRemoveFavorite}
          onOpenChat={handleOpenChatFromFavorites}
        />
      )}

      {currentView === 'active' && activeSession && (
        <ActiveSession
          sessionId={activeSession.id}
          partnerName={activeSession.partner?.name || 'Партнёр по учёбе'}
          partnerInitials={activeSession.partner?.initials}
          isFavorite={activeSession.isFavorite}
          userEmail={user.email}
          onEndSession={handleEndSession}
          onToggleFavorite={() => handleToggleFavorite(activeSession.id)}
          onSendMessage={(text) => handleSendMessage(activeSession.id, text)}
          messages={activeSession.messages}
          onDemoPresenceChange={handleDemoPresenceChange}
        />
      )}

      {currentView === 'active' && !activeSession && (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Сессия не найдена</h1>
            <p className="text-gray-400 mb-6">Возможно, сессия была удалена или истекла</p>
            <Button 
              onClick={() => setCurrentView('sessions')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Вернуться к сессиям
            </Button>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
