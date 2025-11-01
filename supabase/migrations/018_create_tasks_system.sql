-- Создаем таблицу tasks для управления задачами
CREATE TABLE IF NOT EXISTS tasks (
    id bigserial PRIMARY KEY,
    title text NOT NULL,
    
    -- Тип и ID объекта, к которому привязан таск
    entity_type text NOT NULL CHECK (entity_type IN ('profile', 'tax_account', 'transaction', 'exchange', 'eat', 'property')),
    entity_id bigint NOT NULL,
    
    -- Статус таска
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    
    -- Дата окончания
    due_date timestamptz,
    
    -- Кто создал таск
    created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для tasks
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Триггер для обновления updated_at в tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- Создаем таблицу task_assignments для назначения тасков юзерам и админам
CREATE TABLE IF NOT EXISTS task_assignments (
    id bigserial PRIMARY KEY,
    task_id bigint NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Тип назначенного (user или admin)
    assignee_type text NOT NULL CHECK (assignee_type IN ('user', 'admin')),
    
    -- ID юзера или админа
    assignee_id uuid NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для task_assignments
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assignee ON task_assignments(assignee_type, assignee_id);

-- Создаем таблицу task_attachments для файлов
CREATE TABLE IF NOT EXISTS task_attachments (
    id bigserial PRIMARY KEY,
    task_id bigint NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Путь к файлу в storage
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size bigint,
    file_type text,
    
    uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для task_attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);

-- Создаем таблицу task_notes для заметок в таске
CREATE TABLE IF NOT EXISTS task_notes (
    id bigserial PRIMARY KEY,
    task_id bigint NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    note_text text NOT NULL,
    
    created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Индексы для task_notes
CREATE INDEX IF NOT EXISTS idx_task_notes_task ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_created_by ON task_notes(created_by);

-- Триггер для обновления updated_at в task_notes
CREATE OR REPLACE FUNCTION update_task_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_notes_updated_at
    BEFORE UPDATE ON task_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_task_notes_updated_at();

-- RLS политики для tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать таски
CREATE POLICY "Anyone can view tasks"
    ON tasks FOR SELECT
    USING (true);

-- Админы могут создавать таски
CREATE POLICY "Admins can create tasks"
    ON tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять таски
CREATE POLICY "Admins can update tasks"
    ON tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут удалять таски
CREATE POLICY "Admins can delete tasks"
    ON tasks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- RLS политики для task_assignments
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать назначения
CREATE POLICY "Anyone can view task assignments"
    ON task_assignments FOR SELECT
    USING (true);

-- Админы могут создавать назначения
CREATE POLICY "Admins can create task assignments"
    ON task_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут удалять назначения
CREATE POLICY "Admins can delete task assignments"
    ON task_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- RLS политики для task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать файлы
CREATE POLICY "Anyone can view task attachments"
    ON task_attachments FOR SELECT
    USING (true);

-- Админы могут загружать файлы
CREATE POLICY "Admins can create task attachments"
    ON task_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут удалять файлы
CREATE POLICY "Admins can delete task attachments"
    ON task_attachments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- RLS политики для task_notes
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;

-- Все могут просматривать заметки
CREATE POLICY "Anyone can view task notes"
    ON task_notes FOR SELECT
    USING (true);

-- Админы могут создавать заметки
CREATE POLICY "Admins can create task notes"
    ON task_notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут обновлять заметки
CREATE POLICY "Admins can update task notes"
    ON task_notes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Админы могут удалять заметки
CREATE POLICY "Admins can delete task notes"
    ON task_notes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

-- Создаем bucket для хранения файлов тасков
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS политики для storage bucket task-attachments
CREATE POLICY "Admins can upload task attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'task-attachments' AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

CREATE POLICY "Anyone can view task attachments in storage"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'task-attachments');

CREATE POLICY "Admins can delete task attachments from storage"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'task-attachments' AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role_type IN ('workspace_owner', 'platform_super_admin', 'admin')
        )
    );

