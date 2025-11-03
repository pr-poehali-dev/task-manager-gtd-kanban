import { useState, useEffect } from 'react';
import { api, Task } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
}

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColor = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-2 cursor-move hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className={`w-1 h-12 rounded-full ${priorityColor[task.priority]}`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm mb-1 truncate">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
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
                {task.is_blocked && (
                  <Badge variant="destructive" className="text-xs">
                    <Icon name="AlertCircle" size={12} className="mr-1" />
                    Blocked
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Board() {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in_progress', title: 'В работе', tasks: [] },
    { id: 'done', title: 'Готово', tasks: [] },
  ]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadTasks = async () => {
    try {
      const allTasks = await api.getTasks();
      
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          tasks: allTasks.filter((task) => task.kanban_column === col.id),
        }))
      );
    } catch (error) {
      toast.error('Ошибка загрузки задач');
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as number;
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as number;
    const newColumnId = over.id as string;

    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (!task) return;

    if (task.kanban_column !== newColumnId) {
      try {
        await api.updateTask(taskId, { kanbanColumn: newColumnId });
        
        setColumns((prevColumns) =>
          prevColumns.map((col) => {
            if (col.id === task.kanban_column) {
              return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
            }
            if (col.id === newColumnId) {
              return { ...col, tasks: [...col.tasks, { ...task, kanban_column: newColumnId }] };
            }
            return col;
          })
        );

        toast.success('Задача перемещена');
      } catch (error) {
        toast.error('Ошибка перемещения');
      }
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kanban доска</h1>
        <p className="text-muted-foreground">Визуализация рабочего процесса</p>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{column.title}</h2>
                <Badge variant="secondary">{column.tasks.length}</Badge>
              </div>

              <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div
                  className="flex-1 bg-muted/30 rounded-lg p-3 min-h-[500px]"
                  id={column.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                  }}
                >
                  {column.tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <Icon name="Inbox" size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Перетащите сюда</p>
                    </div>
                  ) : (
                    column.tasks.map((task) => <SortableTask key={task.id} task={task} />)
                  )}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <Card className="shadow-lg opacity-90">
              <CardContent className="p-3">
                <h4 className="font-medium text-sm">{activeTask.title}</h4>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
