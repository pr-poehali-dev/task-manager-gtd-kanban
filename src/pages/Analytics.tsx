import { useState, useEffect } from 'react';
import { api, Task } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const statusData = [
    { name: 'Inbox', value: tasks.filter((t) => t.status === 'inbox').length, fill: '#94a3b8' },
    { name: 'To Do', value: tasks.filter((t) => t.status === 'todo').length, fill: '#3b82f6' },
    { name: 'В работе', value: tasks.filter((t) => t.status === 'in_progress').length, fill: '#eab308' },
    { name: 'Готово', value: tasks.filter((t) => t.status === 'done').length, fill: '#22c55e' },
  ];

  const priorityData = [
    { name: 'Низкий', value: tasks.filter((t) => t.priority === 'low').length, fill: '#22c55e' },
    { name: 'Средний', value: tasks.filter((t) => t.priority === 'medium').length, fill: '#eab308' },
    { name: 'Высокий', value: tasks.filter((t) => t.priority === 'high').length, fill: '#f97316' },
    { name: 'Критичный', value: tasks.filter((t) => t.priority === 'critical').length, fill: '#ef4444' },
  ];

  const quadrantData = [
    { name: 'Срочно и важно', value: tasks.filter((t) => t.eisenhower_quadrant === 'urgent_important').length },
    { name: 'Важно', value: tasks.filter((t) => t.eisenhower_quadrant === 'important_not_urgent').length },
    { name: 'Срочно', value: tasks.filter((t) => t.eisenhower_quadrant === 'urgent_not_important').length },
    { name: 'Отложить', value: tasks.filter((t) => t.eisenhower_quadrant === 'neither').length },
  ];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived').length;
  const blockedTasks = tasks.filter((t) => t.is_blocked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="Loader2" size={48} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Аналитика</h1>
        <p className="text-muted-foreground">Статистика и прогресс выполнения</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Icon name="ListTodo" size={32} className="mx-auto mb-2 text-primary" />
            <div className="text-3xl font-bold">{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Всего задач</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Icon name="CheckCircle2" size={32} className="mx-auto mb-2 text-green-500" />
            <div className="text-3xl font-bold">{completedTasks}</div>
            <div className="text-sm text-muted-foreground">Выполнено</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Icon name="Clock" size={32} className="mx-auto mb-2 text-yellow-500" />
            <div className="text-3xl font-bold">{activeTasks}</div>
            <div className="text-sm text-muted-foreground">Активных</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Icon name="TrendingUp" size={32} className="mx-auto mb-2 text-blue-500" />
            <div className="text-3xl font-bold">{completionRate}%</div>
            <div className="text-sm text-muted-foreground">Прогресс</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Распределение по статусам</CardTitle>
            <CardDescription>Сколько задач в каждом статусе</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Приоритеты задач</CardTitle>
            <CardDescription>Распределение по уровням приоритета</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Матрица Эйзенхауэра</CardTitle>
            <CardDescription>Распределение по квадрантам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quadrantData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Дополнительная статистика</CardTitle>
            <CardDescription>Общие метрики продуктивности</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Заблокированные задачи</span>
              <span className="text-2xl font-bold text-red-500">{blockedTasks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Средний приоритет</span>
              <span className="text-2xl font-bold">
                {tasks.length > 0
                  ? (
                      tasks.reduce(
                        (sum, t) =>
                          sum +
                          ({ low: 1, medium: 2, high: 3, critical: 4 }[t.priority] || 0),
                        0
                      ) / tasks.length
                    ).toFixed(1)
                  : '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Задач с дедлайном</span>
              <span className="text-2xl font-bold">
                {tasks.filter((t) => t.due_at).length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Задач в проектах</span>
              <span className="text-2xl font-bold">
                {tasks.filter((t) => t.project_id).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
