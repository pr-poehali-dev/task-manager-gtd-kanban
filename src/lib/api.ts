const API_BASE = {
  auth: 'https://functions.poehali.dev/71032d88-7cae-4a33-a2c2-61131844e540',
  tasks: 'https://functions.poehali.dev/f9b4ad26-686f-421d-9695-06548e5f6555',
  telegram: 'https://functions.poehali.dev/ea68ab1d-e379-45e5-9c2e-bbd0af9b94bf',
};

export interface User {
  id: number;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'inbox' | 'next_action' | 'waiting' | 'someday' | 'todo' | 'in_progress' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  eisenhower_quadrant?: 'urgent_important' | 'important_not_urgent' | 'urgent_not_important' | 'neither';
  kanban_column: string;
  kanban_order: number;
  project_id?: number;
  project?: { id: number; name: string; color: string };
  context_id?: number;
  context?: { id: number; name: string; icon: string };
  due_at?: string;
  remind_at?: string;
  completed_at?: string;
  tags?: string[];
  subtasks?: Array<{ id: number; title: string; completed: boolean; sortOrder: number }>;
  is_blocked: boolean;
  blocked_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  visibility: 'private' | 'team' | 'public';
  archived: boolean;
  task_count?: number;
  created_at: string;
}

export interface Context {
  id: number;
  name: string;
  icon?: string;
}

class TaskManagerAPI {
  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(API_BASE.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', refreshToken }),
      });

      if (response.ok) {
        const data: AuthResponse = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers['X-Auth-Token'] = token;
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const newToken = this.getAuthToken();
        if (newToken) {
          headers['X-Auth-Token'] = newToken;
          response = await fetch(url, { ...options, headers });
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>(API_BASE.auth, {
      method: 'POST',
      body: JSON.stringify({ action: 'register', email, password, fullName }),
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>(API_BASE.auth, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, password }),
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  async getTasks(filters?: {
    status?: string;
    projectId?: number;
    priority?: string;
    quadrant?: string;
  }): Promise<Task[]> {
    const params = new URLSearchParams({ resource: 'tasks' });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
    }

    return this.request<Task[]>(`${API_BASE.tasks}?${params}`);
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    return this.request<Task>(API_BASE.tasks, {
      method: 'POST',
      body: JSON.stringify({ resource: 'task', ...task }),
    });
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(API_BASE.tasks, {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates }),
    });
  }

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>(`${API_BASE.tasks}?resource=projects`);
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    return this.request<Project>(API_BASE.tasks, {
      method: 'POST',
      body: JSON.stringify({ resource: 'project', ...project }),
    });
  }

  async getContexts(): Promise<Context[]> {
    return this.request<Context[]>(`${API_BASE.tasks}?resource=contexts`);
  }

  async createContext(context: Partial<Context>): Promise<Context> {
    return this.request<Context>(API_BASE.tasks, {
      method: 'POST',
      body: JSON.stringify({ resource: 'context', ...context }),
    });
  }
}

export const api = new TaskManagerAPI();
