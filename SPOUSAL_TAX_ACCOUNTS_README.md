# Spousal Tax Accounts

## Обзор

Spousal Tax Accounts позволяют создавать совместные налоговые аккаунты для супругов в соответствии с правилами IRS для 1031 Exchange.

## Особенности

### 🔑 Ключевые функции:

✅ **Совместный account** - Один tax account для обоих супругов  
✅ **Отображается у обоих** - Account виден в профилях обоих супругов  
✅ **Раздельные business names** - Каждый супруг может иметь свой business name  
✅ **Автоматическая генерация номера** - Формат: `INV-[Primary]-[Spouse]-[Seq]`  
✅ **Визуальная индикация** - Бейдж "Spousal/Joint" в списках  

---

## База данных

### Миграция: `030_add_spousal_tax_accounts.sql`

Добавлены поля в таблицу `tax_accounts`:

```sql
is_spousal BOOLEAN DEFAULT false
spouse_profile_id BIGINT REFERENCES profile(id)
primary_profile_id BIGINT
```

**Логика:**
- `is_spousal = true` - это spousal account
- `profile_id` - основной owner (primary)
- `spouse_profile_id` - второй супруг
- `primary_profile_id` - дублирует profile_id для ясности

---

## Создание Spousal Tax Account

### UI Flow:

```
1. Открыть профиль пользователя
2. Нажать "+ Create Tax Account"
3. Переключить на "Spousal/Joint"
4. Выбрать spouse из dropdown
5. Заполнить данные для обоих:
   - Primary Tax Account Name
   - Primary Business Name (optional)
   - Spouse Tax Account Name  
   - Spouse Business Name (optional)
6. Создать
```

### Что создается:

**1. Один Tax Account:**
```
name: "John Smith & Mary Smith"
profile_id: John's ID (primary)
spouse_profile_id: Mary's ID
is_spousal: true
account_number: "INV-SMISMI001"
```

**2. Business Names (опционально):**
```
Business Name #1: "John Smith"
  tax_account_id: [spousal account id]

Business Name #2: "Mary Smith"
  tax_account_id: [spousal account id]
```

**3. Fee Schedule:**
- Автоматически из активных templates

---

## Компоненты

### 1. CreateTaxAccountModal

**Location:** `src/components/CreateTaxAccountModal/`

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  currentProfileId: number;
  currentProfileName: string;
  onSuccess: () => void;
}
```

**Features:**
- Toggle: Individual / Spousal
- Spouse selector (dropdown с профилями)
- Separate fields для обоих супругов
- Автозаполнение имен
- Validation

### 2. Утилиты

**Location:** `src/lib/spousal-tax-accounts.ts`

**Functions:**

```typescript
// Создание spousal account
createSpousalTaxAccount(data: SpousalTaxAccountData): Promise<Result>

// Получение всех accounts профиля (включая spousal)
getProfileTaxAccounts(profileId: number): Promise<TaxAccount[]>
```

---

## Отображение

### В списке Tax Accounts профиля:

```
┌─────────────────────────────────────────┐
│ John Smith & Mary Smith  [Spousal/Joint]│
│ Joint with: Mary Smith                  │
│ Created: Nov 6, 2025                    │
│                          View Details → │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ John Smith                              │
│ Created: Oct 15, 2025                   │
│                          View Details → │
└─────────────────────────────────────────┘
```

**Индикация:**
- 🟣 **Purple badge** - "Spousal/Joint"
- 💜 **Purple text** - "Joint with: [Spouse Name]"
- ✅ **Обычные** - без badges

---

## Примеры использования

### Пример 1: Простой spousal account

```typescript
createSpousalTaxAccount({
  primaryProfileId: 1,  // John
  primaryTaxAccountName: "John Smith",
  primaryBusinessName: "John Smith",
  
  spouseProfileId: 2,  // Mary
  spouseTaxAccountName: "Mary Smith",
  spouseBusinessName: "Mary Smith",
});

// Result:
// Tax Account: "John Smith & Mary Smith"
// Business Names: "John Smith", "Mary Smith"
// Account Number: "INV-SMISMI001"
```

### Пример 2: С LLC

```typescript
createSpousalTaxAccount({
  primaryProfileId: 1,
  primaryTaxAccountName: "Matthew Pike",
  primaryBusinessName: "Pike Properties LLC",
  
  spouseProfileId: 5,
  spouseTaxAccountName: "Sarah Pike",
  spouseBusinessName: "Pike Holdings LLC",
});

// Result:
// Tax Account: "Matthew Pike & Sarah Pike"
// Business Names: "Pike Properties LLC", "Pike Holdings LLC"
```

---

## Правила IRS

### ✅ Соответствие:

1. **Same Taxpayer Rule**
   - Spousal account = один налогоплательщик
   - Оба супруга участвуют в 1031 Exchange

2. **Joint Ownership**
   - Title deed: "John & Mary Smith, Joint Tenants"
   - Transaction на оба имени
   - Business Name может быть совместным

3. **Community Property**
   - В 9 штатах автоматически 50/50
   - Spousal account соответствует этому

### ❌ Что нельзя:

- ❌ Смешивать business names из разных tax accounts
- ❌ Продавать через spousal, покупать через individual
- ❌ Один супруг выходит из exchange без согласия второго

---

## Интеграция

### Где интегрировано:

1. **✅ Profile Page** - Создание и отображение
2. **⏳ Tax Accounts List Page** - Еще не интегрировано (TODO)
3. **✅ Database** - Миграция применена
4. **✅ Utilities** - Функции готовы

### Что осталось:

- [ ] Интеграция на страницу списка tax accounts
- [ ] Обновление страницы tax account details для показа spouse info
- [ ] Добавление фильтра "Spousal Only" в списках
- [ ] UI для "разделения" spousal account (divorce scenario)

---

## Тестирование

### Сценарий 1: Создание spousal account

1. Открыть профиль John Smith
2. "+ Create Tax Account"
3. Выбрать "Spousal/Joint"
4. Выбрать Mary Smith
5. Заполнить имена
6. Создать
7. ✅ Account появляется у John
8. ✅ Account появляется у Mary
9. ✅ Badge "Spousal/Joint" отображается

### Сценарий 2: Работа с транзакциями

1. Создать Sale transaction для spousal account
2. В Sellers выбрать business name из spousal account
3. ✅ Доступны оба business names (John Smith, Mary Smith)
4. ❌ НЕ доступны business names из других accounts

### Сценарий 3: 1031 Exchange

1. Продажа через "John & Mary Smith"
2. Proceeds поступают в spousal account
3. Оба супруга могут принимать решения
4. Покупка также через "John & Mary Smith"
5. ✅ Same Taxpayer Rule соблюдается

---

## Account Number Format

### Individual Account:
```
Format: INV + [LastName 3 chars] + [Sequence 3 digits]
Example: INVSMI001
```

### Spousal Account:
```
Format: INV- + [Primary 3 chars] + [Spouse 3 chars] + [Sequence 3 digits]
Example: INV-SMIJOH001
```

Это позволяет сразу видеть, что account spousal!

---

## API

### Create Spousal Account

```typescript
import { createSpousalTaxAccount } from '@/lib/spousal-tax-accounts';

const result = await createSpousalTaxAccount({
  primaryProfileId: 1,
  primaryTaxAccountName: "John Smith",
  primaryBusinessName: "John Smith Properties",
  spouseProfileId: 2,
  spouseTaxAccountName: "Mary Smith",
  spouseBusinessName: "Mary Smith Investments",
});

if (result.success) {
  console.log('Created:', result.taxAccountId);
} else {
  console.error('Error:', result.error);
}
```

### Get Profile Tax Accounts

```typescript
import { getProfileTaxAccounts } from '@/lib/spousal-tax-accounts';

const accounts = await getProfileTaxAccounts(profileId);

// Returns both individual AND spousal accounts
accounts.forEach(account => {
  if (account.is_spousal) {
    console.log('Spousal with:', account.spouse_profile);
  } else {
    console.log('Individual:', account.name);
  }
});
```

---

## Troubleshooting

### Problem: Spouse не появляется в dropdown

**Причина:** Профиль не существует в БД

**Решение:**
1. Создать профиль для spouse
2. Проверить что profile_id не равен current profile
3. Перезагрузить modal

### Problem: Account не виден у второго супруга

**Причина:** Функция getProfileTaxAccounts не включает spouse_profile_id

**Решение:**
- Используйте `getProfileTaxAccounts()` вместо прямого запроса
- Эта функция использует `OR` условие для обоих ID

### Problem: Business Names смешиваются

**Причина:** Не фильтруются по tax_account_id

**Решение:**
- Всегда фильтровать business names по выбранному tax account
- НЕ показывать business names из других accounts

---

## Заключение

Spousal Tax Accounts реализованы в соответствии с правилами IRS для 1031 Exchange! 

Основные преимущества:
- ✅ Соответствие требованиям IRS
- ✅ Удобный UI для создания
- ✅ Автоматическая видимость для обоих супругов
- ✅ Визуальная индикация
- ✅ Поддержка раздельных business names

**Status:** ✅ Готово к использованию на странице профиля!

