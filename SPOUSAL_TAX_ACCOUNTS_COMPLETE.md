# Spousal Tax Accounts - Полная реализация

## ✅ Что реализовано

### 1. База данных (Migration)

**Файл:** `supabase/migrations/030_add_spousal_tax_accounts.sql`

Добавленные поля в `tax_accounts`:
```sql
is_spousal BOOLEAN DEFAULT false
spouse_profile_id BIGINT REFERENCES profile(id)
primary_profile_id BIGINT
```

### 2. Backend (Утилиты)

**Файл:** `src/lib/spousal-tax-accounts.ts`

**Функции:**
- `createSpousalTaxAccount()` - Создает spousal tax account
- `getProfileTaxAccounts()` - Получает все accounts профиля (включая spousal)

### 3. UI Компоненты

**Файлы:**
- `src/components/CreateTaxAccountModal/CreateTaxAccountModal.tsx`
- `src/components/CreateTaxAccountModal/CreateTaxAccountModalWithProfileSelect.tsx`

**Особенности:**
- ✅ Toggle: Individual / Spousal/Joint
- ✅ Dropdown для выбора spouse
- ✅ Раздельные поля для обоих супругов
- ✅ Автозаполнение имен
- ✅ Validation

### 4. Интеграция

**Интегрировано на 3 страницах:**

#### ✅ `/profiles/[id]` - Страница профиля
- Новое modal с режимом spousal
- Отображение spousal accounts с бейджем
- Показывает spouse info

#### ✅ `/tax-accounts` - Список tax accounts
- Modal с выбором primary profile
- Бейдж "Spousal" в таблице
- Показывает обоих супругов

#### ✅ `/tax-accounts/[id]` - Детали tax account
- Секция "Primary Owner" вместо "Profile"
- Бейдж "Spousal"
- Информация о spouse в отдельном блоке

---

## 🎯 Как работает

### Создание Spousal Tax Account

#### На странице профиля (`/profiles/[id]`):

```
1. Кликнуть "+ Create Tax Account"
2. Выбрать "Spousal/Joint"
3. Выбрать spouse из dropdown
4. Заполнить:
   ┌─────────────────────────────┐
   │ Primary Owner: John Smith  │
   │ • Tax Account Name         │
   │ • Business Name (optional) │
   │                             │
   │ Spouse: Mary Smith         │
   │ • Tax Account Name         │
   │ • Business Name (optional) │
   └─────────────────────────────┘
5. Создать
```

**Результат:**
```
Tax Account: "John Smith & Mary Smith"
  ├── Business Name: "John Smith"
  └── Business Name: "Mary Smith"

Account Number: INV-SMISMI001

Visible to:
  ✅ John Smith profile
  ✅ Mary Smith profile
```

#### На странице списка (`/tax-accounts`):

```
1. Кликнуть "+ Create Tax Account"
2. Выбрать primary owner из dropdown
3. Кликнуть "Continue"
4. Далее как на странице профиля
```

---

## 📊 Отображение

### В списке профиля:

```
┌──────────────────────────────────────┐
│ John Smith & Mary Smith  [Spousal] 🟣│
│ Joint with: Mary Smith               │
│ Created: Nov 6, 2025                 │
│                       View Details → │
└──────────────────────────────────────┘
```

### На странице details:

```
┌─────────────────────────────────────┐
│ Tax Account Details                 │
├─────────────────────────────────────┤
│ Primary Owner [Spousal] 🟣          │
│ John Smith                          │
│ john@example.com                    │
│ ─────────────────────                │
│ Spouse:                             │
│ Mary Smith                          │
│ mary@example.com                    │
└─────────────────────────────────────┘
```

### В таблице списка:

```
Name                        | Account#      | Owner
─────────────────────────────────────────────────────
John & Mary [Spousal]🟣   | INV-SMISMI001 | John Smith & Mary Smith
John Smith                 | INVSMI002     | John Smith
```

---

## 🔑 Ключевые особенности

### 1. Один account - два профиля

```sql
SELECT * FROM tax_accounts WHERE is_spousal = true;

id | name                  | profile_id | spouse_profile_id
───┼───────────────────────┼────────────┼──────────────────
 1 | John Smith & Mary     |     5      |        8
```

**Запрос для John (id=5):**
```sql
SELECT * FROM tax_accounts 
WHERE profile_id = 5 OR spouse_profile_id = 5;
```
Результат: Вернет этот spousal account ✅

**Запрос для Mary (id=8):**
```sql
SELECT * FROM tax_accounts 
WHERE profile_id = 8 OR spouse_profile_id = 8;
```
Результат: Вернет этот же spousal account ✅

### 2. Business Names принадлежат Tax Account

```sql
business_names
  id | name          | tax_account_id
  ───┼───────────────┼────────────────
   1 | John Smith    |      1
   2 | Mary Smith    |      1
```

Оба business names принадлежат ОДНОМУ spousal tax account!

### 3. Transactions используют один tax account

```
Sale Transaction:
  Seller: John & Mary Smith
  Tax Account: [Spousal Account ID=1]
  Business Name: "John Smith" или "Mary Smith"
  → Proceeds идут в ONE spousal account
  → ONE 1031 Exchange для обоих
```

---

## 📋 Примеры использования

### Пример 1: Совместная продажа

```
Title Deed: "John Smith and Mary Smith, Joint Tenants"

Create Transaction:
  ✅ Use Spousal Tax Account
  ✅ Seller: John & Mary Smith  
  ✅ Business Name: "John Smith" (или "Mary Smith")
  ✅ Proceeds: $1,000,000 → Spousal Account
  ✅ 1031 Exchange: Both participate
```

### Пример 2: Раздельные business names

```
Spousal Account: "John & Mary Smith"
  ├── Business Name: "Smith Properties LLC" (rental)
  └── Business Name: "Smith Holdings LLC" (investments)

Property A (rental):
  Business Name: "Smith Properties LLC"
  
Property B (investment):
  Business Name: "Smith Holdings LLC"

Но оба business names в ОДНОМ spousal account!
```

### Пример 3: Комбинация Individual + Spousal

```
John Smith имеет:
  1. Individual Tax Account "John Smith Rentals"
  2. Spousal Tax Account "John & Mary Smith"

Mary Smith имеет:
  1. Individual Tax Account "Mary Smith Investments"  
  2. Spousal Tax Account "John & Mary Smith" (тот же!)

При создании transaction John может выбрать:
  ✅ Individual → "John Smith Rentals"
  ✅ Spousal → "John & Mary Smith"
```

---

## 🎨 UI Flow

### Создание на /profiles/[id]:

```
Profile Page (John Smith)
  ↓
[+ Create Tax Account]
  ↓
┌──────────────────────────┐
│ Individual | Spousal     │ ← Toggle
└──────────────────────────┘
  ↓ (если Spousal)
┌──────────────────────────┐
│ Select Spouse:           │
│ [Mary Smith ▼]           │
└──────────────────────────┘
  ↓
┌──────────────────────────┐
│ Primary: John Smith      │
│ • Tax Name: John Smith   │
│ • Business: [optional]   │
│                          │
│ Spouse: Mary Smith       │
│ • Tax Name: Mary Smith   │
│ • Business: [optional]   │
└──────────────────────────┘
  ↓
[Create Tax Account]
  ↓
Account создан и виден у обоих!
```

### Создание на /tax-accounts:

```
Tax Accounts List Page
  ↓
[+ Create Tax Account]
  ↓
┌──────────────────────────┐
│ Select Primary Owner:    │
│ [John Smith ▼]           │
│ [Continue]               │
└──────────────────────────┘
  ↓
Далее тот же flow что на profile page
```

---

## ⚠️ Важные правила

### ✅ Можно:

1. ✅ Создавать spousal account для любых двух профилей
2. ✅ Иметь несколько business names в spousal account
3. ✅ Использовать раздельные business names для разных свойств
4. ✅ Видеть account у обоих супругов
5. ✅ Иметь и individual и spousal accounts одновременно

### ❌ Нельзя:

1. ❌ Использовать business name из другого tax account в транзакции
2. ❌ Смешивать individual и spousal в одной транзакции
3. ❌ Продавать через spousal, покупать через individual (Same Taxpayer Rule!)
4. ❌ Выбирать себя как spouse
5. ❌ Создать spousal account без выбора spouse

---

## 🚀 Статус реализации

| Компонент | Статус | Страница |
|-----------|--------|----------|
| Database Migration | ✅ | - |
| Backend Utilities | ✅ | - |
| CreateTaxAccountModal | ✅ | Component |
| Profile Page Integration | ✅ | `/profiles/[id]` |
| Tax Accounts List Integration | ✅ | `/tax-accounts` |
| Tax Account Details | ✅ | `/tax-accounts/[id]` |
| Display Spousal Badge | ✅ | All pages |
| Spouse Info Display | ✅ | All pages |
| Documentation | ✅ | This file |

---

## 📝 Account Number Format

### Individual:
```
Format: INV + [LastName3] + [Seq3]
Example: INVSMI001
         ^^^─┬──^ ^^─┬─^
            │      └── Sequence
            └── Last name (3 chars)
```

### Spousal:
```
Format: INV- + [Primary3] + [Spouse3] + [Seq3]
Example: INV-SMIJOH001
         ^^^^─┬──^ ^^─┬─^ ^^^
             │      │    └── Sequence
             │      └── Spouse last name
             └── Primary last name
```

---

## 🎉 Готово к использованию!

Все компоненты Spousal Tax Accounts полностью реализованы и интегрированы в систему!

### Где использовать:

1. **Создание:**
   - `/profiles/[id]` - "+ Create Tax Account"
   - `/tax-accounts` - "+ Create Tax Account"

2. **Просмотр:**
   - `/profiles/[id]` - список tax accounts (с бейджем)
   - `/tax-accounts` - таблица всех accounts (с бейджем)
   - `/tax-accounts/[id]` - детали с spouse info

3. **Использование:**
   - При создании transaction выбирать spousal account
   - Business names из spousal account доступны
   - Оба супруга видят account в своих профилях

**Соответствует всем правилам IRS для 1031 Exchange!** ✅

