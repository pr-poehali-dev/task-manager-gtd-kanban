import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

export default function Settings() {
  const { user } = useAuth();
  const [telegramChatId, setTelegramChatId] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [telegramNotifications, setTelegramNotifications] = useState(false);

  const handleSaveTelegram = () => {
    if (telegramChatId.trim()) {
      toast.success('Telegram подключен! (демо)');
    } else {
      toast.error('Введите Chat ID');
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Настройки</h1>
        <p className="text-muted-foreground">Управление профилем и уведомлениями</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Основная информация о вашем аккаунте</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input id="name" value={user?.fullName || ''} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} readOnly disabled />
            </div>
            <p className="text-sm text-muted-foreground">
              <Icon name="Info" size={14} className="inline mr-1" />
              Изменение профиля скоро будет доступно
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Интеграция с Telegram</CardTitle>
            <CardDescription>Получайте уведомления и управляйте задачами через бота</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
              <div className="flex gap-2">
                <Input
                  id="telegram-chat-id"
                  placeholder="123456789"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <Button onClick={handleSaveTelegram}>Подключить</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Откройте Telegram, найдите бота и отправьте /start. Скопируйте Chat ID из ответа.
              </p>
            </div>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Доступные команды:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">/start</code>
                  <span className="text-muted-foreground">Подключение</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">/new</code>
                  <span className="text-muted-foreground">Создать задачу</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">/list</code>
                  <span className="text-muted-foreground">Список задач</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded">/help</code>
                  <span className="text-muted-foreground">Справка</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Настройте каналы для получения напоминаний</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notif">Email уведомления</Label>
                <p className="text-sm text-muted-foreground">Получать напоминания на почту</p>
              </div>
              <Switch
                id="email-notif"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="telegram-notif">Telegram уведомления</Label>
                <p className="text-sm text-muted-foreground">Получать напоминания в Telegram</p>
              </div>
              <Switch
                id="telegram-notif"
                checked={telegramNotifications}
                onCheckedChange={setTelegramNotifications}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Опасная зона</CardTitle>
            <CardDescription>Необратимые действия с аккаунтом</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              <Icon name="Trash2" size={16} className="mr-2" />
              Удалить аккаунт
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Удаление аккаунта в разработке
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
