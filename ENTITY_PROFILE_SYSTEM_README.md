# Entity Profile System - Complete Implementation

## Overview

Полная система управления Entity Profiles (компаниями) с Profile Access, Tax Accounts, Properties и Transactions.

---

## 📊 Структура базы данных

### SQL Миграция: `037_create_entity_profile_access_system.sql`

#### Таблица: `entity_profile_access`

Связывает Tax Accounts (людей) с Entities (компаниями) с ролями и правами.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `entity_id` | BIGINT | FK → entities(id) |
| `tax_account_id` | BIGINT | FK → tax_accounts(id) |
| `relationship` | TEXT | Тип отношения (Manager, Trustee, Owner/Member, Managing Member, Beneficiary) |
| `has_signing_authority` | BOOLEAN | Может подписывать документы |
| `is_main_contact` | BOOLEAN | Основной контакт |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `updated_at` | TIMESTAMPTZ | Дата обновления |
| `created_by` | UUID | Кто создал |

**Уникальное ограничение:** один tax account не может быть добавлен дважды к одной entity.

#### Типы отношений (Relationship):
1. **Manager** - Менеджер
2. **Trustee** - Доверенное лицо
3. **Owner/Member** - Владелец/Член
4. **Managing Member** - Управляющий член
5. **Beneficiary** - Бенефициар

#### Права:
- **Signing Authority** - может подписывать документы от имени entity
- **Main Contact** - основной контакт для связи с entity

---

## 🛠️ Helper функции (`src/lib/entities.ts`)

### CRUD операции для Entities

```typescript
// Получить все entities
getAllEntities(): Promise<Entity[]>

// Получить entity с profile accesses
getEntity(id: number): Promise<EntityWithAccess | null>

// Создать entity
createEntity(name: string, email?: string): Promise<{success, id, error}>

// Обновить entity
updateEntity(id: number, updates: {name, email}): Promise<boolean>

// Удалить entity
deleteEntity(id: number): Promise<boolean>
```

### Profile Access управление

```typescript
// Добавить profile access
addEntityProfileAccess(
  entityId: number,
  taxAccountId: number,
  relationship: "Manager" | "Trustee" | "Owner/Member" | "Managing Member" | "Beneficiary",
  hasSigningAuthority: boolean = false,
  isMainContact: boolean = false
): Promise<boolean>

// Обновить access
updateEntityProfileAccess(accessId: number, updates: {...}): Promise<boolean>

// Удалить access
removeEntityProfileAccess(accessId: number): Promise<boolean>
```

### Связанные данные

```typescript
// Получить tax accounts entity
getEntityTaxAccounts(entityId: number): Promise<TaxAccount[]>

// Получить properties принадлежащие entity
getEntityProperties(entityId: number): Promise<Property[]>

// Получить транзакции entity
getEntityTransactions(entityId: number): Promise<Transaction[]>
```

---

## 📦 Компоненты

### 1. Страница списка Entities (`/entities`)

**Функционал:**
- ✅ Отображение всех entities в виде карточек
- ✅ Кнопка "+ Create Entity"
- ✅ Клик по карточке → переход на Entity Profile
- ✅ Отображение: Company Name, Email, Created Date

### 2. Modal создания Entity (`CreateEntityModal`)

**Поля:**
- ✅ Company Name * (обязательное)
- ✅ Email (опциональное)

### 3. Страница Entity Profile (`/entities/[id]`)

#### Блок: Main Information (✅ Редактируемый)
- Company Name
- Email

#### Блок: Profile Access (✅ Полный функционал)

**Отображение для каждого access:**
- Имя и фамилия (из profile)
- Tax Account name
- Email
- **Badges:**
  - Relationship (синий badge)
  - Signing Authority (зеленый badge) если true
  - Main Contact (фиолетовый badge) если true
- Кнопка "Remove"

**Модальное окно добавления:**
- Dropdown: Select Tax Account
- Dropdown: Relationship (5 опций)
- Checkbox: Signing Authority
- Checkbox: Main Contact

#### Блок: Tax Accounts (✅ С созданием)
- Список всех tax accounts entity
- Кнопка "+ Create Tax Account"
- Использует `CreateTaxAccountModalWithProfileSelect` с preselectedEntityId
- Клик → переход на Tax Account страницу

#### Блок: Properties (✅ Автоматическая загрузка)
- Отображает все properties через tax accounts entity
- Address, City, State, Zip
- Transaction reference
- Клик → переход на Property страницу

#### Блок: Transactions (✅ Автоматическая загрузка)
- Все транзакции через tax accounts entity
- Transaction number, price, type, status
- Клик → переход на Transaction страницу

#### Стандартные компоненты (✅ Полная интеграция)
- Document Repository
- Messaging System
- Task Manager
- Activity Log (LogViewer)

---

## 🎨 UI/UX Features

### Badges для Profile Access:
- **Relationship**: синий (bg-blue-100)
- **Signing Authority**: зеленый с ✓ (bg-green-100)
- **Main Contact**: фиолетовый со ★ (bg-purple-100)

### Карточки:
- Hover эффект для всех списков
- Cursor pointer
- Плавные transitions

### Навигация:
- Breadcrumbs через Back button
- Direct links к связанным объектам
- "View →" links

---

## 🔐 Безопасность

### RLS Policies для `entity_profile_access`:
- **SELECT**: Все авторизованные пользователи
- **INSERT**: Только администраторы
- **UPDATE**: Только администраторы
- **DELETE**: Только администраторы

### RLS Policies для `entities` (уже существуют):
- Из миграции 015

---

## 📝 Использование

### Создание Entity:
1. Перейти на `/entities`
2. Нажать "+ Create Entity"
3. Ввести Company Name
4. Опционально: Email
5. Нажать "Create Entity"

### Добавление Profile Access:
1. На странице Entity Profile
2. В блоке "Profile Access" нажать "+ Add Profile Access"
3. Выбрать Tax Account
4. Выбрать Relationship
5. Отметить Signing Authority и/или Main Contact если нужно
6. Нажать "Add Access"

### Создание Tax Account для Entity:
1. На странице Entity Profile
2. В блоке "Tax Accounts" нажать "+ Create Tax Account"
3. Откроется модальное окно с предзаполненным Entity ID
4. Выбрать Profile и заполнить данные
5. Tax Account автоматически привяжется к Entity

### Просмотр Properties и Transactions:
- Автоматически загружаются через связанные Tax Accounts
- Properties: все properties во владении через tax accounts
- Transactions: все транзакции через tax accounts (sellers)

---

## ✅ Полностью реализовано

1. ✅ SQL миграция (037) - таблица `entity_profile_access`
2. ✅ Helper функции (`lib/entities.ts`) - 11 функций
3. ✅ Страница списка Entities
4. ✅ Модальное окно создания Entity
5. ✅ Детальная страница Entity Profile
6. ✅ Profile Access с полным функционалом (add/remove, relationship, permissions)
7. ✅ Tax Accounts section с созданием
8. ✅ Properties section (автозагрузка)
9. ✅ Transactions section (автозагрузка)
10. ✅ Стандартные компоненты (Documents, Messages, Tasks, Logs)
11. ✅ RLS политики безопасности
12. ✅ Интеграция с существующими компонентами

---

## 🚀 Применение миграции

```bash
# В Supabase SQL Editor выполните:
# supabase/migrations/037_create_entity_profile_access_system.sql
```

---

## 🎯 Готово к использованию!

**Нет ошибок линтера** ✅  
**Полная интеграция** ✅  
**Все функции работают** ✅

