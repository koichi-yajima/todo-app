export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  reminderTime?: string;
  notes?: string;
  listId?: string;
  subtasks?: SubTask[];
  order: number;
  createdAt: string;
}

export interface List {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface ReorderRequest {
  orderedIds: string[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
