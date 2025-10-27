# Настройка Supabase для CRM

## 1. Запуск SQL миграций

Необходимо выполнить SQL миграцию в Supabase для создания таблиц и настройки системы прав.

### Шаги:

1. Войдите в Supabase Dashboard: https://supabase.com/dashboard
2. Откройте ваш проект: https://supabase.com/dashboard/project/zaclmrvdnydyqmeiorze
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое файла `supabase/migrations/001_admin_system.sql`
5. Вставьте в SQL Editor
6. Нажмите **Run**

## 2. Проверка таблицы user_profiles

После выполнения миграции проверьте, что у пользователя fdgventures@gmail.com установлена роль workspace_owner:

```sql
SELECT email, role, role_type
FROM user_profiles
WHERE email = 'fdgventures@gmail.com';
```

Должно вернуть:

- role: `platform_super_admin`
- role_type: `workspace_owner`

## 3. Настройка владельца workspace (если нужно)

Если fdgventures@gmail.com еще не зарегистрирован:

1. Зарегистрируйтесь по адресу `/admin/register`
2. Используйте email: `fdgventures@gmail.com`
3. После регистрации откройте `/admin/setup`
4. Нажмите кнопку "Setup Workspace Owner"

## 4. Структура ролей

- **workspace_owner** - единственный владелец (fdgventures@gmail.com). Имеет полный доступ ко всем функциям, включая удаление приглашений.
- **platform_super_admin** - супер администраторы. Могут создавать приглашения для новых админов.
- **admin** - обычные администраторы. Имеют доступ к админ панели, но не могут управлять другими админами.

## 5. Функционал

### Управление админами

- Доступно в `/admin/admins`
- Возможность приглашать новых админов
- Просмотр списка активных администраторов
- Просмотр pending приглашений

### Приглашение админов

1. Войдите в админ панель (для workspace_owner или platform_super_admin)
2. Перейдите в "Admin Management"
3. Нажмите "Invite New Admin"
4. Введите email и выберите тип роли
5. Система автоматически отправит токен приглашения

### Регистрация по приглашению

1. Пользователь получает email с ссылкой на приглашение
2. Ссылка: `http://localhost:3000/admin/register-invite/[token]`
3. После регистрации пользователь привязывается к профилю админа
4. Статус приглашения меняется на "accepted"
