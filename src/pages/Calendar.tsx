import { useState, useEffect } from 'react';
import { api, Task } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Calendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.filter((t) => t.due_at));
    } catch (error) {
      toast.error('Ошибка загрузки задач');
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ru });
  const calendarEnd = endOfWeek(monthEnd, { locale: ru });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => task.due_at && isSameDay(new Date(task.due_at), day));
  };

  const selectedDayTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  const priorityColor = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Календарь</h1>
          <p className="text-muted-foreground">Дедлайны и расписание задач</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <Icon name="ChevronLeft" size={18} />
          </Button>
          <div className="w-48 text-center font-semibold">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <Icon name="ChevronRight" size={18} />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            Сегодня
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const dayTasks = getTasksForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-20 p-2 rounded-lg border-2 transition-all text-left
                        ${isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:border-muted'}
                        ${!isCurrentMonth ? 'opacity-40' : ''}
                        ${isToday ? 'bg-accent' : ''}
                      `}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className={`w-full h-1 rounded ${priorityColor[task.priority]}`}
                          />
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-xs text-muted-foreground">+{dayTasks.length - 2}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">
                {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
              </h3>

              {selectedDate ? (
                selectedDayTasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayTasks.map((task) => (
                      <Card key={task.id} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <div className={`w-1 h-10 rounded-full ${priorityColor[task.priority]}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {task.priority}
                                </Badge>
                                {task.project && (
                                  <Badge variant="secondary" className="text-xs">
                                    {task.project.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Icon name="Calendar" size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">Нет задач</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Icon name="CalendarDays" size={32} className="mb-2 opacity-50" />
                  <p className="text-sm text-center">Выберите день для просмотра задач</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
