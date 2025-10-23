import { Calendar, Users, Menu, UserCircle, LogOut, Heart } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";

interface HeaderProps {
  currentView: 'calendar' | 'sessions' | 'active' | 'profile' | 'admin' | 'favorites';
  onViewChange: (view: 'calendar' | 'sessions' | 'active' | 'profile' | 'admin' | 'favorites') => void;
  userName: string;
  userInitials: string;
  userAvatar?: string;
  onLogout: () => void;
  isAdmin?: boolean;
}

export function Header({ currentView, onViewChange, userName, userInitials, userAvatar, onLogout, isAdmin = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: 'calendar' | 'sessions' | 'profile' | 'admin' | 'favorites') => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-blue-600">PARTA</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Совместное обучение</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            <Button 
              variant={currentView === 'calendar' ? 'default' : 'ghost'}
              onClick={() => onViewChange('calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Забронировать
            </Button>
            <Button 
              variant={currentView === 'sessions' ? 'default' : 'ghost'}
              onClick={() => onViewChange('sessions')}
            >
              <Users className="w-4 h-4 mr-2" />
              Мои сессии
            </Button>
            <Button 
              variant={currentView === 'favorites' ? 'default' : 'ghost'}
              onClick={() => onViewChange('favorites')}
            >
              <Heart className="w-4 h-4 mr-2" />
              Избранное
            </Button>
            {isAdmin && (
              <Button 
                variant={currentView === 'admin' ? 'default' : 'ghost'}
                onClick={() => onViewChange('admin')}
              >
                Админка
              </Button>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>{userName}</div>
                  <div className="text-xs text-gray-500">Профиль</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewChange('profile')}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Настройки профиля
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div>{userName}</div>
                      <div className="text-sm text-gray-500">Пользователь</div>
                    </div>
                  </div>

                  <Button 
                    variant={currentView === 'calendar' ? 'default' : 'ghost'}
                    onClick={() => handleNavClick('calendar')}
                    className="justify-start"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Забронировать
                  </Button>
                  <Button 
                    variant={currentView === 'sessions' ? 'default' : 'ghost'}
                    onClick={() => handleNavClick('sessions')}
                    className="justify-start"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Мои сессии
                  </Button>
                  <Button 
                    variant={currentView === 'favorites' ? 'default' : 'ghost'}
                    onClick={() => handleNavClick('favorites')}
                    className="justify-start"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Избранное
                  </Button>
                  <Button 
                    variant={currentView === 'profile' ? 'default' : 'ghost'}
                    onClick={() => handleNavClick('profile')}
                    className="justify-start"
                  >
                    <UserCircle className="w-4 h-4 mr-2" />
                    Профиль
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant={currentView === 'admin' ? 'default' : 'ghost'}
                      onClick={() => handleNavClick('admin')}
                      className="justify-start"
                    >
                      Админка
                    </Button>
                  )}

                  <div className="pt-4 border-t">
                    <Button 
                      variant="ghost"
                      onClick={onLogout}
                      className="justify-start w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
