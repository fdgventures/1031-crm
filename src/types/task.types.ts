export type TaskStatus = 'pending' | 'completed';

export type TaskEntityType = 'profile' | 'tax_account' | 'transaction' | 'exchange' | 'eat' | 'property';

export type AssigneeType = 'user' | 'admin';

export interface Task {
  id: number;
  title: string;
  entity_type: TaskEntityType;
  entity_id: number;
  status: TaskStatus;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  assignee_type: AssigneeType;
  assignee_id: string;
  created_at: string;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaskNote {
  id: number;
  task_id: number;
  note_text: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  assignments?: TaskAssignment[];
  attachments?: TaskAttachment[];
  notes?: TaskNote[];
  assignee_profiles?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

export interface CreateTaskInput {
  title: string;
  entity_type: TaskEntityType;
  entity_id: number;
  due_date?: string;
  assignee_ids?: string[];
  assignee_types?: AssigneeType[];
}

export interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
  due_date?: string | null;
}

