import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Heart, MessageCircle, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";

interface FavoritesViewProps {
  favoritePartners: string[];
  onRemoveFavorite?: (partnerName: string) => void;
  onOpenChat?: (partnerName: string) => void;
}

export function FavoritesView({ 
  favoritePartners,
  onRemoveFavorite,
  onOpenChat
}: FavoritesViewProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl mb-2 flex items-center gap-2">
          <Heart className="w-8 h-8 text-red-500 fill-current" />
          Избранные партнёры
        </h2>
        <p className="text-gray-600">Ваши любимые партнёры по учёбе</p>
      </div>

      {favoritePartners.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl mb-2 text-gray-600">Пока нет избранных партнёров</h3>
          <p className="text-gray-500">
            Добавьте партнёров в избранное во время сессий или в истории сессий
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoritePartners.map((partner, index) => (
            <Card key={index} className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-20 h-20 mb-4">
                  <AvatarFallback className="text-xl">
                    {partner.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <h3 className="mb-1">{partner}</h3>
                
                <Badge variant="outline" className="text-red-500 border-red-500 mb-4">
                  <Heart className="w-3 h-3 fill-current mr-1" />
                  Избранное
                </Badge>

                <div className="flex gap-2 w-full mt-2">
                  {onOpenChat && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => onOpenChat(partner)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Написать
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    <Calendar className="w-4 h-4 mr-2" />
                    Сессия
                  </Button>
                </div>
                
                {onRemoveFavorite && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 text-gray-500 hover:text-red-600"
                    onClick={() => onRemoveFavorite(partner)}
                  >
                    <Heart className="w-4 h-4 mr-2 fill-current" />
                    Удалить из избранного
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="mb-2 flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            Совет
          </h3>
          <p className="text-sm text-gray-700">
            Добавляйте партнёров в избранное, с которыми вам комфортно учиться. 
            Это поможет вам легко находить их для будущих сессий!
          </p>
        </Card>
      </div>
    </div>
  );
}
