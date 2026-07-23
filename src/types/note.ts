export interface NoteMeta {
  id: string;
  title: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Note {
  meta: NoteMeta;
  content: string;
  backlinks: string[];
}
