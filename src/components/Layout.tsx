import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Inbox', path: '/inbox', icon: 'Inbox' },
    { name: 'Проекты', path: '/projects', icon: 'Folder' },
    { name: 'Доска', path: '/board', icon: 'LayoutGrid' },
    { name: 'Матрица', path: '/matrix', icon: 'Grid2x2' },
    { name: 'Календарь', path: '/calendar', icon: 'Calendar' },
    { name: 'Аналитика', path: '/analytics', icon: 'BarChart3' },
    { name: 'Настройки', path: '/settings', icon: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Icon name="CheckSquare" size={24} className="text-primary" />
          <span className="font-semibold text-lg">Task Manager</span>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2',
                    location.pathname === item.path && 'bg-secondary'
                  )}
                >
                  <Icon name={item.icon} size={18} />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <Icon name="LogOut" size={16} className="mr-2" />
            Выйти
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
