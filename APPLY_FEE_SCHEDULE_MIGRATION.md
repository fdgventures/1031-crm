# Применение миграции Fee Schedule System

## Как применить миграцию

### Шаги для применения:

1. **Войдите в Supabase Dashboard**
   - Перейдите по ссылке: https://supabase.com/dashboard
   - Откройте ваш проект: https://supabase.com/dashboard/project/zaclmrvdnydyqmeiorze

2. **Откройте SQL Editor**
   - В левом меню выберите "SQL Editor"
   - Нажмите "New Query"

3. **Скопируйте и выполните миграцию**
   - Откройте файл: `supabase/migrations/024_create_fee_schedule_system.sql`
   - Скопируйте **ВСЕ** содержимое файла
   - Вставьте в SQL Editor
   - Нажмите **Run** (или Ctrl+Enter)

4. **Проверьте успешное выполнение**
   - В результатах выполнения должно быть "Success"
   - Не должно быть ошибок

### Проверка создания таблиц

После выполнения миграции проверьте создание таблиц:

```sql
-- Проверка существования таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('fee_templates', 'fee_schedules', 'fee_change_history')
ORDER BY table_name;
```

Должно вернуть 3 строки:
- fee_change_history
- fee_schedules
- fee_templates

### Проверка политик RLS

```sql
-- Проверка политик Row Level Security
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('fee_templates', 'fee_schedules', 'fee_change_history')
ORDER BY tablename, policyname;
```

Должны отобразиться все созданные политики для каждой таблицы.

## Что дальше?

После применения миграции:

1. **Создайте первые шаблоны Fee**
   - Откройте `/admin/dashboard`
   - Прокрутите вниз до "Управление Fee шаблонами"
   - Создайте несколько шаблонов комиссий

2. **Протестируйте создание Tax Account**
   - Откройте `/tax-accounts`
   - Создайте новый Tax Account
   - Проверьте, что Fee автоматически созданы

3. **Проверьте редактирование Fee**
   - Откройте страницу созданного Tax Account
   - Найдите секцию "Fee Schedule"
   - Попробуйте изменить цену с комментарием
   - Проверьте историю изменений

## Откат миграции (если необходимо)

Если нужно откатить изменения:

```sql
-- ВНИМАНИЕ: Это удалит все данные!
DROP TABLE IF EXISTS fee_change_history CASCADE;
DROP TABLE IF EXISTS fee_schedules CASCADE;
DROP TABLE IF EXISTS fee_templates CASCADE;

-- Удалить функции
DROP FUNCTION IF EXISTS update_fee_templates_updated_at();
DROP FUNCTION IF EXISTS update_fee_schedules_updated_at();
DROP FUNCTION IF EXISTS log_fee_price_change();
```

## Проблемы и решения

### Ошибка: "relation already exists"

Если таблицы уже существуют:
```sql
-- Проверьте существующие таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'fee%';
```

### Ошибка: "permission denied"

Убедитесь, что вы вошли как владелец проекта в Supabase Dashboard.

## Дополнительная информация

Подробная документация по использованию системы находится в файле `FEE_SCHEDULE_README.md`.

