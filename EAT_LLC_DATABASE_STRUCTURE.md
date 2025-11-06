# EAT LLC Database Structure

## Обзор

Система для создания и управления **EAT LLCs** (Exchange Accommodation Titleholder) - специальных компаний для временного владения недвижимостью в сложных 1031 Exchange сценариях.

---

## 📊 Структура базы данных

### Таблица: `eat_llcs`

Основная таблица для хранения EAT LLC entities.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | BIGSERIAL | Primary key |
| `company_name` | TEXT | Юридическое название LLC * |
| `eat_number` | TEXT | Авто-генерируемый номер: `EAT-[STATE]-[SEQ]` |
| `state_formation` | TEXT | Штат регистрации LLC * |
| `date_formation` | DATE | Дата регистрации LLC * |
| `licensed_in` | TEXT | Штат лицензии для операций |
| `ein` | TEXT | Employer Identification Number (Tax ID) |
| `registered_agent` | TEXT | Registered Agent name |
| `registered_agent_address` | TEXT | Registered Agent address |
| `qi_company_id` | UUID | QI Company, которая управляет этим EAT |
| `status` | TEXT | Статус: Active, Inactive, Dissolved |
| `created_at` | TIMESTAMPTZ | Дата создания в системе |
| `updated_at` | TIMESTAMPTZ | Дата последнего обновления |
| `created_by` | UUID | Пользователь, создавший запись |

**Обязательные поля (*):**
- `company_name`
- `state_formation`
- `date_formation`

---

### Таблица: `eat_llc_profile_access`

Связь между EAT LLC и профилями (кто имеет доступ для подписания документов).

| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | BIGSERIAL | Primary key |
| `eat_llc_id` | BIGINT | FK → eat_llcs(id) |
| `profile_id` | BIGINT | FK → profile(id) |
| `access_type` | TEXT | Тип доступа: signer, viewer, manager |
| `granted_at` | TIMESTAMPTZ | Когда предоставлен доступ |
| `granted_by` | UUID | Кто предоставил доступ |

**Access Types:**
- `signer` - Может подписывать документы от имени LLC
- `viewer` - Только просмотр
- `manager` - Полный контроль (подписание + управление)

**Constraint:** `UNIQUE(eat_llc_id, profile_id)` - один профиль = один доступ к LLC

---

### Таблица: `us_states`

Справочная таблица штатов США для dropdowns.

| Колонка | Тип | Описание |
|---------|-----|----------|
| `code` | TEXT | Код штата (PK): CA, TX, DE, etc. |
| `name` | TEXT | Полное название: California, Texas, etc. |
| `is_popular_for_llc` | BOOLEAN | Популярен для LLC формирования |

**Популярные штаты для LLC:**
- ✅ **Delaware (DE)** - Самый популярный, гибкое законодательство
- ✅ **Wyoming (WY)** - Низкие налоги, privacy
- ✅ **Nevada (NV)** - Нет state income tax
- ✅ **Texas (TX)** - Нет state income tax
- ✅ **Florida (FL)** - Благоприятные условия

---

## 🔑 Индексы

Созданы для оптимизации запросов:

```sql
-- EAT LLCs
idx_eat_llcs_eat_number        -- Поиск по номеру
idx_eat_llcs_qi_company        -- Фильтр по QI компании
idx_eat_llcs_state_formation   -- Фильтр по штату
idx_eat_llcs_status            -- Фильтр по статусу

-- Profile Access
idx_eat_llc_profile_access_eat_llc   -- Поиск доступов для LLC
idx_eat_llc_profile_access_profile   -- Поиск LLC для профиля
```

---

## 🔢 EAT Number Format

Автоматически генерируется функцией `generate_eat_number(state_code)`:

**Формат:** `EAT-[STATE]-[SEQ]`

**Примеры:**
```
EAT-DE-001  -- Первый EAT в Delaware
EAT-DE-002  -- Второй EAT в Delaware
EAT-WY-001  -- Первый EAT в Wyoming
EAT-CA-001  -- Первый EAT в California
```

**Логика:**
- Префикс: `EAT-`
- State Code: 2 буквы (DE, WY, etc.)
- Sequence: 3 цифры (001, 002, ...)
- Sequence уникален для каждого штата

---

## 🔒 Row Level Security (RLS)

### EAT LLCs:

| Операция | Кто может | Правило |
|----------|-----------|---------|
| SELECT | Все | Любой аутентифицированный пользователь |
| INSERT | Админы | workspace_owner, platform_super_admin, admin |
| UPDATE | Админы | workspace_owner, platform_super_admin, admin |
| DELETE | Owner | Только workspace_owner |

### Profile Access:

| Операция | Кто может | Правило |
|----------|-----------|---------|
| SELECT | Все | Любой аутентифицированный пользователь |
| INSERT | Админы | workspace_owner, platform_super_admin, admin |
| DELETE | Админы | workspace_owner, platform_super_admin, admin |

---

## 📝 Примеры использования

### Пример 1: Создать EAT LLC

```sql
-- 1. Создать EAT LLC
INSERT INTO eat_llcs (
    company_name,
    state_formation,
    date_formation,
    licensed_in,
    qi_company_id,
    status
) VALUES (
    'Accommodator Holdings LLC',
    'DE',  -- Delaware
    '2025-01-15',
    'CA',  -- Licensed in California
    'uuid-of-qi-company',
    'Active'
);

-- 2. Автоматически генерируется eat_number
-- Result: eat_number = 'EAT-DE-001'

-- 3. Добавить profile access (signing authority)
INSERT INTO eat_llc_profile_access (
    eat_llc_id,
    profile_id,
    access_type
) VALUES (
    1,  -- ID созданного EAT
    5,  -- ID профиля админа
    'signer'  -- Может подписывать
);
```

### Пример 2: Получить EAT с доступами

```sql
SELECT 
    e.*,
    json_agg(
        json_build_object(
            'profile_id', p.id,
            'name', p.first_name || ' ' || p.last_name,
            'email', p.email,
            'access_type', epa.access_type
        )
    ) as profile_accesses
FROM eat_llcs e
LEFT JOIN eat_llc_profile_access epa ON epa.eat_llc_id = e.id
LEFT JOIN profile p ON p.id = epa.profile_id
WHERE e.id = 1
GROUP BY e.id;
```

### Пример 3: Найти все EAT для QI Company

```sql
SELECT 
    id,
    company_name,
    eat_number,
    state_formation,
    status,
    date_formation
FROM eat_llcs
WHERE qi_company_id = 'uuid-of-qi-company'
    AND status = 'Active'
ORDER BY date_formation DESC;
```

### Пример 4: Найти EAT где профиль имеет доступ

```sql
SELECT 
    e.id,
    e.company_name,
    e.eat_number,
    epa.access_type
FROM eat_llcs e
INNER JOIN eat_llc_profile_access epa ON epa.eat_llc_id = e.id
WHERE epa.profile_id = 5  -- ID профиля
    AND e.status = 'Active'
ORDER BY e.company_name;
```

---

## 🎯 Связи с другими таблицами

### Существующие:

```
eat_llcs
  ├─→ qi_companies (qi_company_id)
  └─→ user_profiles (created_by)

eat_llc_profile_access
  ├─→ eat_llcs (eat_llc_id)
  ├─→ profile (profile_id)
  └─→ user_profiles (granted_by)
```

### Будущие (для полной EAT функциональности):

```
eat_arrangements (еще не создана)
  ├─→ eat_llcs (eat_llc_id)
  ├─→ exchanges (exchange_id)
  └─→ properties (property_id)
```

---

## 🚀 Следующие шаги

После применения этих миграций нужно создать:

1. **TypeScript types** - Интерфейсы для EAT LLC
2. **Утилиты** - CRUD операции для EAT
3. **UI компоненты:**
   - EAT LLC List (страница `/eat`)
   - EAT LLC Create Modal (в админке QI)
   - EAT LLC Details (страница `/eat/[id]`)
4. **Интеграция** - Связь с exchanges и properties

---

## 📋 Валидация на уровне БД

### Constraints:

✅ `eat_number` - UNIQUE  
✅ `status` - CHECK IN ('Active', 'Inactive', 'Dissolved')  
✅ `access_type` - CHECK IN ('signer', 'viewer', 'manager')  
✅ `(eat_llc_id, profile_id)` - UNIQUE (нет дубликатов доступа)  

### Cascades:

- `eat_llcs.qi_company_id` → ON DELETE SET NULL
- `eat_llc_profile_access.eat_llc_id` → ON DELETE CASCADE (удалить доступы)
- `eat_llc_profile_access.profile_id` → ON DELETE CASCADE (удалить при удалении профиля)

---

## 💡 Примеры данных

### EAT LLC Example:

```
company_name: "Accommodator Holdings LLC"
eat_number: "EAT-DE-001"
state_formation: "DE" (Delaware)
date_formation: "2025-01-15"
licensed_in: "CA" (California)
ein: "12-3456789"
status: "Active"

Profile Access:
  - John Admin (signer)
  - Mary Manager (manager)
```

### Multiple EATs:

```
QI Company: "1031 Exchange Services Inc"
  ├── EAT-DE-001: "Accommodator Holdings LLC"
  ├── EAT-DE-002: "Property Parking LLC"
  ├── EAT-WY-001: "Wyoming EAT Services LLC"
  └── EAT-NV-001: "Nevada Parking Solutions LLC"
```

---

## 🔧 Функции БД

### `generate_eat_number(state_code TEXT)`

Генерирует уникальный номер EAT для указанного штата.

**Использование:**
```sql
SELECT generate_eat_number('DE');
-- Returns: 'EAT-DE-001' (or next available number)
```

**Логика:**
1. Считает количество EAT в этом штате
2. Добавляет +1
3. Форматирует с padding zeros (001, 002, ...)
4. Возвращает: `EAT-[STATE]-[SEQ]`

---

## ✅ Готово к применению

Миграции созданы:
- ✅ `031_create_eat_llc_system.sql` - Таблицы EAT
- ✅ `032_add_us_states_reference.sql` - Справочник штатов

**Следующий шаг:** Применить миграции к базе данных!

```bash
# Если используете Supabase CLI:
supabase db push

# Или через Supabase Dashboard:
# SQL Editor → Paste migration → Run
```

После применения можно создавать UI для управления EAT LLCs! 🎉

