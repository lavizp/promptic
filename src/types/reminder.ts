export interface Reminder {
  id: number;
  message: string;
  scheduled_at: string;
  created_at: string;
  triggered: boolean;
}
