import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Users } from "lucide-react";
import { toast } from "sonner@2.0.3";

interface AuthViewProps {
  onLogin: (name: string, email: string) => void;
}

export function AuthView({ onLogin }: AuthViewProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("Заполните все поля");
      return;
    }
    // Simulate login
    onLogin("Пользователь", loginEmail);
    toast.success("Добро пожаловать!");
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      toast.error("Заполните все поля");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Пароль должен быть минимум 6 символов");
      return;
    }
    // Simulate signup
    onLogin(signupName, signupEmail);
    toast.success("Аккаунт создан!");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl text-blue-600 mb-2">PARTA</h1>
          <p className="text-gray-600">Совместное обучение</p>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="example@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Войти
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Имя</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Ваше имя"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="example@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Зарегистрироваться
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 text-center mb-3">
              Или попробуйте демо-версию
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onLogin("Гость", "guest@demo.com")}
            >
              Войти как гость
            </Button>
          </div>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Присоединяйтесь к сообществу студентов для совместного обучения
        </p>
      </div>
    </div>
  );
}
