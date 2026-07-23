export type TodoCategory = 'work' | 'fitness' | 'personal';
export type TodoType = 'daily' | 'backlog';
export type TodoStatus = 'pending' | 'completed';

export interface Todo {
  id: number;
  description: string;
  category: TodoCategory;
  type: TodoType;
  status: TodoStatus;
  created_at: string;
  completed_at: string | null;
}
