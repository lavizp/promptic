export type TodoStatus = 'pending' | 'completed';

export interface Todo {
  id: number;
  description: string;
  category: string;
  status: TodoStatus;
  created_at: string;
  completed_at: string | null;
}

export interface Category {
  name: string;
  created_at: string;
}
