import { useState, useEffect } from 'react';
import { api, Task } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

interface Quadrant {
  id: 'urgent_important' | 'important_not_urgent' | 'urgent_not_important' | 'neither';
  title: string;
  subtitle: string;
  color: string;
  action: string;
  tasks: Task[];
}

export default function Matrix() {
  const [quadrants, setQuadrants] = useState<Quadrant[]>([
    {
      id: 'urgent_important',
      title: 'Срочно и важно',
      subtitle: 'Сделать сейчас',
      color: 'bg-red-500/10 border-red-500',
      action: 'Выполнить',
      tasks: [],
    },
    {
      id: 'important_not_urgent',
      title: 'Важно, не срочно',
      subtitle: 'Запланировать',
      color: 'bg-blue-500/10 border-blue-500',
      action: 'Планировать',
      tasks: [],
    },
    {
      id: 'urgent_not_important',
      title: 'Срочно, не важно',
      subtitle: 'Делегировать',
      color: 'bg-yellow-500/10 border-yellow-500',
      action: 'Делегировать',
      tasks: [],
    },
    {
      id: 'neither',
      title: 'Ни срочно, ни важно',
      subtitle: 'Удалить',
      color: 'bg-gray-500/10 border-gray-500',
      action: 'Отложить',
      tasks: [],
    },
  ]);

  const loadTasks = async () => {
    try {
      const allTasks = await api.getTasks();
      
      setQuadrants((prevQuadrants) =>
        prevQuadrants.map((q) => ({
          ...q,
          tasks: allTasks.filter((task) => task.eisenhower_quadrant === q.id),
        }))
      );
    } catch (error) {
      toast.error('Ошибка загрузки задач');
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleMoveTask = async (task: Task, newQuadrant: string) => {
    try {
      await api.updateTask(task.id, {
        eisenhowerQuadrant: newQuadrant as Task['eisenhower_quadrant'],
      });
      toast.success('Задача перемещена');
      loadTasks();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const priorityColor = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Матрица Эйзенхауэра</h1>
        <p className="text-muted-foreground">Приоритизация по важности и срочности</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quadrants.map((quadrant) => (
          <Card key={quadrant.id} className={`${quadrant.color} border-2`}>
            <CardContent className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-1">{quadrant.title}</h2>
                <p className="text-sm text-muted-foreground mb-2">{quadrant.subtitle}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{quadrant.tasks.length} задач</Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    → {quadrant.action}
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {quadrant.tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Icon name="CheckCircle" size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Нет задач</p>
                  </div>
                ) : (
                  quadrant.tasks.map((task) => (
                    <Card key={task.id} className="bg-background">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className={`w-1 h-10 rounded-full ${priorityColor[task.priority]}`} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1 truncate">{task.title}</h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                              {task.project && (
                                <Badge variant="secondary" className="text-xs">
                                  {task.project.name}
                                </Badge>
                              )}
                              {task.due_at && (
                                <Badge variant="outline" className="text-xs">
                                  <Icon name="Calendar" size={10} className="mr-1" />
                                  {new Date(task.due_at).toLocaleDateString('ru-RU')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-1">
                          {quadrants
                            .filter((q) => q.id !== quadrant.id)
                            .slice(0, 3)
                            .map((q) => (
                              <Button
                                key={q.id}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => handleMoveTask(task, q.id)}
                              >
                                {q.action}
                              </Button>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Icon name="Info" size={18} />
            Как пользоваться матрицей
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-red-500">Срочно и важно:</strong> Кризисы и дедлайны. Делайте
              немедленно.
            </div>
            <div>
              <strong className="text-blue-500">Важно, не срочно:</strong> Стратегия и развитие.
              Планируйте время.
            </div>
            <div>
              <strong className="text-yellow-500">Срочно, не важно:</strong> Отвлечения.
              Делегируйте или минимизируйте.
            </div>
            <div>
              <strong className="text-gray-500">Ни срочно, ни важно:</strong> Потери времени.
              Откажитесь.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
