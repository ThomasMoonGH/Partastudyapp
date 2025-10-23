import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Camera, Save, Heart } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Badge } from "./ui/badge";

interface ProfileViewProps {
  userName: string;
  userEmail: string;
  userAvatar?: string;
  favoritePartners?: string[];
  missedSessions?: Array<{ sessionId: string; date: Date }>;
  isBlocked?: boolean;
  onUpdateProfile: (name: string, avatar?: string) => void;
}

export function ProfileView({ 
  userName, 
  userEmail, 
  userAvatar, 
  favoritePartners = [],
  missedSessions = [],
  isBlocked = false,
  onUpdateProfile 
}: ProfileViewProps) {
  const [name, setName] = useState(userName);
  const [avatarUrl, setAvatarUrl] = useState(userAvatar || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Имя не может быть пустым");
      return;
    }
    onUpdateProfile(name, avatarUrl);
    setIsEditing(false);
    toast.success("Профиль обновлён!");
  };

  const handleCancel = () => {
    setName(userName);
    setAvatarUrl(userAvatar || "");
    setIsEditing(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl mb-2">Профиль</h2>
        <p className="text-gray-600">Управляйте информацией о себе</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col items-center mb-6 pb-6 border-b">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="text-2xl">
                {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                onClick={() => {
                  const url = prompt("Введите URL изображения:");
                  if (url) setAvatarUrl(url);
                }}
              >
                <Camera className="w-4 h-4" />
              </Button>
            )}
          </div>
          {!isEditing && (
            <div className="text-center mt-4">
              <h3 className="text-xl">{name}</h3>
              <p className="text-sm text-gray-600">{userEmail}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={userEmail}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">Email нельзя изменить</p>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="avatar">URL аватара (опционально)</Label>
              <Input
                id="avatar"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex-1">
              Редактировать профиль
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex-1">
                Отмена
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Предупреждение о блокировке */}
      {isBlocked && (
        <Card className="p-6 mt-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-2xl">🚫</div>
            <div className="flex-1">
              <h3 className="mb-2 text-red-900">Аккаунт заблокирован</h3>
              <p className="text-sm text-red-800 mb-3">
                Ваш аккаунт заблокирован из-за пропущенных сессий. Вы не можете бронировать новые сессии.
              </p>
              <p className="text-xs text-red-700">
                Пожалуйста, свяжитесь с поддержкой для разблокировки.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Предупреждение о пропусках */}
      {!isBlocked && (() => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const missedInLastMonth = missedSessions.filter(m => new Date(m.date) >= oneMonthAgo);
        const missedCount = missedInLastMonth.length;
        
        if (missedCount > 0) {
          return (
            <Card className={`p-6 mt-6 ${missedCount >= 2 ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`text-2xl ${missedCount >= 2 ? 'text-orange-500' : 'text-yellow-600'}`}>⚠️</div>
                <div className="flex-1">
                  <h3 className={`mb-2 ${missedCount >= 2 ? 'text-orange-900' : 'text-yellow-900'}`}>
                    {missedCount >= 2 ? 'Внимание! Риск блокировки' : 'Предупреждение о пропуске'}
                  </h3>
                  <p className={`text-sm mb-2 ${missedCount >= 2 ? 'text-orange-800' : 'text-yellow-800'}`}>
                    У вас <strong>{missedCount} {missedCount === 1 ? 'пропуск' : 'пропуска'}</strong> за последний месяц.
                    {missedCount >= 2 && ' Ещё один пропуск - и вы будете заблокированы!'}
                  </p>
                  <p className={`text-xs ${missedCount >= 2 ? 'text-orange-700' : 'text-yellow-700'}`}>
                    Пожалуйста, отменяйте сессии заранее, если не можете присутствовать.
                  </p>
                </div>
              </div>
            </Card>
          );
        }
        return null;
      })()}

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h3 className="mb-4">Статистика</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl text-blue-600 mb-1">12</div>
              <div className="text-sm text-gray-600">Всего сессий</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl text-green-600 mb-1">8</div>
              <div className="text-sm text-gray-600">Этот месяц</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl text-purple-600 mb-1">24ч</div>
              <div className="text-sm text-gray-600">Время учёбы</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className={`text-2xl mb-1 ${(() => {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                const count = missedSessions.filter(m => new Date(m.date) >= oneMonthAgo).length;
                return count >= 2 ? 'text-red-600' : count >= 1 ? 'text-orange-600' : 'text-green-600';
              })()}`}>
                {(() => {
                  const oneMonthAgo = new Date();
                  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                  return missedSessions.filter(m => new Date(m.date) >= oneMonthAgo).length;
                })()}
              </div>
              <div className="text-sm text-gray-600">Пропусков</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            <h3>Избранные партнёры</h3>
          </div>
          {favoritePartners.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>Пока нет избранных партнёров</p>
              <p className="text-xs mt-1">Добавьте партнёров в избранное во время сессий</p>
            </div>
          ) : (
            <div className="space-y-2">
              {favoritePartners.map((partner, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {partner.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1">{partner}</span>
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    <Heart className="w-3 h-3 fill-current" />
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
