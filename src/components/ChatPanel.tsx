import { useState, useRef, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Send, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";

export interface Message {
  id: string;
  sender: 'user' | 'partner';
  text: string;
  timestamp: Date;
}

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  partnerName: string;
  partnerInitials?: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ChatPanel({ 
  messages, 
  onSendMessage, 
  partnerName,
  partnerInitials = "П",
  isMinimized = false,
  onToggleMinimize 
}: ChatPanelProps) {
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isMinimized && onToggleMinimize) {
    return (
      <Button
        variant="default"
        size="icon"
        onClick={onToggleMinimize}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Чат с {partnerName}
        </h3>
        {onToggleMinimize && (
          <Button variant="ghost" size="sm" onClick={onToggleMinimize}>
            Свернуть
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              Начните переписку
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'partner' && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs">{partnerInitials}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm break-words">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {message.sender === 'user' && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="text-xs bg-blue-600">Вы</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Напишите сообщение..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button onClick={handleSend} disabled={!messageText.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
