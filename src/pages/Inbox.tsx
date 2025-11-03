import { useState, useEffect } from 'react';
import { api, Task } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Inbox() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks({ status: 'inbox' });
      setTasks(data);
    } catch (error) {
      toast.error('Ошибка загрузки задач');
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setLoading(true);
    try {
      await api.createTask({ title: newTask, status: 'inbox' });
      setNewTask('');
      toast.success('Задача добавлена');
      loadTasks();
    } catch (error) {
      toast.error('Ошибка создания задачи');
    } finally {
      setLoading(false);
    }
  };

  const handleClarify = async (task: Task, newStatus: string) => {
    try {
      await api.updateTask(task.id, { status: newStatus as Task['status'] });
      toast.success('Задача организована');
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
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Inbox</h1>
        <p className="text-muted-foreground">Быстрый захват идей и задач</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Добавить задачу</CardTitle>
          <CardDescription>Запишите всё, что приходит в голову</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTask} className="flex gap-2">
            <Input
              placeholder="Что нужно сделать?"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !newTask.trim()}>
              <Icon name="Plus" size={18} />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Icon name="Check" size={48} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Inbox пуст. Всё организовано!</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-1 h-12 rounded-full ${priorityColor[task.priority]}`} />
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                    )}
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => handleClarify(task, value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Организовать" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="next_action">
                            <Icon name="Zap" size={14} className="inline mr-2" />
                            Next Action
                          </SelectItem>
                          <SelectItem value="todo">
                            <Icon name="ListTodo" size={14} className="inline mr-2" />
                            To Do
                          </SelectItem>
                          <SelectItem value="waiting">
                            <Icon name="Clock" size={14} className="inline mr-2" />
                            Ожидает
                          </SelectItem>
                          <SelectItem value="someday">
                            <Icon name="Calendar" size={14} className="inline mr-2" />
                            Someday
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="outline">{task.priority}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
