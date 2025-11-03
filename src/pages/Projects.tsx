import { useState, useEffect } from 'react';
import { api, Project, Task } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3B82F6');
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      toast.error('Ошибка загрузки проектов');
    }
  };

  const loadTasks = async (projectId: number) => {
    try {
      const data = await api.getTasks({ projectId });
      setTasks(data);
    } catch (error) {
      toast.error('Ошибка загрузки задач');
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject !== null) {
      loadTasks(selectedProject);
    }
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await api.createProject({
        name: newProjectName,
        description: newProjectDesc,
        color: newProjectColor,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setDialogOpen(false);
      toast.success('Проект создан');
      loadProjects();
    } catch (error) {
      toast.error('Ошибка создания проекта');
    }
  };

  const statusCount = (status: string) =>
    tasks.filter((t) => t.status === status).length;

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Проекты</h1>
          <p className="text-muted-foreground">Управление проектами и задачами</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icon name="Plus" size={18} className="mr-2" />
              Новый проект
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать проект</DialogTitle>
              <DialogDescription>Добавьте новый проект для организации задач</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Название</Label>
                <Input
                  id="project-name"
                  placeholder="Мой проект"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Описание</Label>
                <Input
                  id="project-desc"
                  placeholder="Краткое описание проекта"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-color">Цвет</Label>
                <div className="flex gap-2">
                  <Input
                    id="project-color"
                    type="color"
                    value={newProjectColor}
                    onChange={(e) => setNewProjectColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input value={newProjectColor} readOnly />
                </div>
              </div>
              <Button type="submit" className="w-full">Создать</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-all ${
                selectedProject === project.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedProject(project.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{project.task_count || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {projects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Icon name="FolderOpen" size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">Нет проектов</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedProject !== null ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {projects.find((p) => p.id === selectedProject)?.name}
                  </CardTitle>
                  <CardDescription>
                    {projects.find((p) => p.id === selectedProject)?.description || 'Без описания'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{tasks.length}</div>
                      <div className="text-xs text-muted-foreground">Всего</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{statusCount('todo')}</div>
                      <div className="text-xs text-muted-foreground">To Do</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">
                        {statusCount('in_progress')}
                      </div>
                      <div className="text-xs text-muted-foreground">В работе</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{statusCount('done')}</div>
                      <div className="text-xs text-muted-foreground">Готово</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon
                          name={task.status === 'done' ? 'CheckCircle2' : 'Circle'}
                          size={18}
                          className={task.status === 'done' ? 'text-green-500' : 'text-muted-foreground'}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">{task.priority}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {tasks.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Icon name="ListTodo" size={48} className="text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Нет задач в проекте</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24">
                <Icon name="ArrowLeft" size={48} className="text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Выберите проект слева</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
