# EAT Invoice System - Construction Information

## Overview

Полностью реализованная система управления инвойсами для Construction Information в EAT Parked Files. Поддерживает создание, редактирование, удаление инвойсов и управление invoice items.

---

## 📊 Структура базы данных

### Таблицы (созданы в миграции 034)

#### `eat_invoices`
Основная таблица для инвойсов

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `eat_parked_file_id` | BIGINT | FK → eat_parked_files |
| `invoice_type` | TEXT | "Invoice paid through exchange" / "Invoice paid outside of exchange" |
| `paid_to` | TEXT | Кому оплачено |
| `invoice_date` | DATE | Дата инвойса |
| `invoice_number` | TEXT | Номер инвойса (опционально) |
| `invoice_document_path` | TEXT | Путь к файлу (для будущего) |
| `total_amount` | NUMERIC(15,2) | **Авто-расчет** из invoice items |
| `start_date` | DATE | Дата начала работ |
| `estimated_completion_date` | DATE | Плановая дата завершения |
| `actual_completion_date` | DATE | Фактическая дата завершения |

#### `eat_invoice_items`
Позиции в инвойсах

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `eat_invoice_id` | BIGINT | FK → eat_invoices |
| `property_id` | BIGINT | FK → properties (из EAT Acquisition) |
| `description` | TEXT | Описание работ/материалов |
| `amount` | NUMERIC(15,2) | Сумма позиции |

### Триггеры

**Авто-расчет total_amount:**
- При добавлении item → пересчитать total
- При изменении item amount → пересчитать total
- При удалении item → пересчитать total

```sql
CREATE TRIGGER update_invoice_total_on_item_insert
CREATE TRIGGER update_invoice_total_on_item_update
CREATE TRIGGER update_invoice_total_on_item_delete
```

---

## 🛠️ Helper функции (`src/lib/eat-invoices.ts`)

### CRUD операции

#### Чтение
```typescript
// Получить все инвойсы для EAT Parked File
getEATInvoices(eatParkedFileId: number): Promise<EATInvoiceWithItems[]>

// Получить один инвойс с items
getEATInvoice(invoiceId: number): Promise<EATInvoiceWithItems | null>
```

#### Создание
```typescript
// Создать инвойс с items
createEATInvoice(input: CreateEATInvoiceInput): Promise<{success, id, error}>

// Добавить item к существующему инвойсу
addEATInvoiceItem(invoiceId: number, item: {...}): Promise<boolean>
```

#### Обновление
```typescript
// Обновить инвойс
updateEATInvoice(invoiceId: number, updates: UpdateEATInvoiceInput): Promise<boolean>

// Обновить item
updateEATInvoiceItem(itemId: number, updates: {...}): Promise<boolean>
```

#### Удаление
```typescript
// Удалить инвойс (cascade удалит items)
deleteEATInvoice(invoiceId: number): Promise<boolean>

// Удалить item
deleteEATInvoiceItem(itemId: number): Promise<boolean>
```

#### Вспомогательные
```typescript
// Получить properties из EAT Acquisition транзакций
getEATAcquisitionProperties(eatParkedFileId: number): Promise<Property[]>
```

---

## 📦 Компоненты

### EATInvoiceModal (`src/components/EATInvoiceModal`)

Модальное окно для создания и редактирования инвойсов.

#### Props
```typescript
interface EATInvoiceModalProps {
  eatParkedFileId: number;
  invoice?: EATInvoiceWithItems | null; // Если передан - режим редактирования
  onClose: () => void;
  onSuccess: () => void;
}
```

#### Функционал

**Секция 1: Invoice Information**
- ✅ Dropdown: Select Invoice (paid through/outside exchange)
- ✅ Input: Paid To *
- ✅ Date: Invoice Date *
- ✅ Input: Invoice Number (optional)
- ✅ Date: Start Date
- ✅ Date: Est. Completion Date
- ✅ Date: Actual Completion Date

**Секция 2: Invoice Items**
- ✅ Кнопка "+ Add Item"
- ✅ Для каждого item:
  - Dropdown: Invoice Property (из EAT Acquisition транзакций)
  - Input: Description *
  - Input: Amount *
  - Кнопка "Remove"
- ✅ Total Amount (авто-расчет)

**Validation:**
- Paid To обязательно
- Invoice Date обязательно
- Минимум 1 item
- Для каждого item: Description и Amount > 0

---

## 🎨 Страница EAT Parked File - Construction Information

### Improvement Timeline
Отображает даты из первого инвойса:
- Start Date
- Est. Completion Date
- Actual Completion Date

### Invoices Table

**Колонки:**
- Invoice Date
- Paid To
- Amount (bold, с $)
- Type (badge: green = through exchange, blue = outside)
- Items (список с описанием и суммами)
- Actions (Edit | Delete)

**Features:**
- ✅ Кнопка "+ Add Invoice"
- ✅ Таблица со всеми инвойсами
- ✅ Клик "Edit" открывает модальное окно с данными
- ✅ Клик "Delete" удаляет после подтверждения
- ✅ Отображение всех items с properties (если указаны)
- ✅ Color coding по типу инвойса

---

## 🔐 Безопасность

### RLS Policies

**eat_invoices:**
- SELECT: Все авторизованные пользователи
- INSERT/UPDATE/DELETE: Только администраторы

**eat_invoice_items:**
- SELECT: Все авторизованные пользователи
- INSERT/UPDATE/DELETE: Только администраторы

---

## 💡 Особенности реализации

### 1. Авто-расчет Total Amount
Триггер в PostgreSQL автоматически пересчитывает `total_amount` при любом изменении items.

### 2. Properties из EAT Acquisition
Функция `getEATAcquisitionProperties()` получает список properties из транзакций типа "EAT Acquisition", что позволяет связывать invoice items с конкретными проперти.

### 3. Timeline из инвойсов
Improvement Timeline на странице показывает даты из первого (последнего созданного) инвойса.

### 4. Edit Mode
При редактировании инвойса форма предзаполняется существующими данными. Items тоже можно редактировать (в текущей версии через удаление старого и создание нового инвойса).

---

## 📝 Использование

### Создание инвойса

1. Открыть страницу EAT Parked File
2. В блоке "Construction Information" нажать **"+ Add Invoice"**
3. Заполнить информацию:
   - Выбрать тип (через exchange или нет)
   - Указать Paid To и Invoice Date
   - Опционально: Invoice Number, Timeline dates
4. Нажать **"+ Add Item"**
5. Для каждого item:
   - Выбрать Property (опционально)
   - Указать Description и Amount
6. Проверить Total Amount
7. Нажать **"Create Invoice"**

### Редактирование инвойса

1. В таблице инвойсов нажать **"Edit"**
2. Изменить нужные поля
3. Нажать **"Update Invoice"**

### Удаление инвойса

1. В таблице инвойсов нажать **"Delete"**
2. Подтвердить удаление
3. Инвойс и все его items будут удалены (CASCADE)

---

## ✅ Что реализовано

1. ✅ Helper функции (CRUD для invoices и items)
2. ✅ Модальное окно создания/редактирования
3. ✅ Управление invoice items (add/remove)
4. ✅ Выбор properties из EAT Acquisition
5. ✅ Отображение списка инвойсов в таблице
6. ✅ Edit и Delete функционал
7. ✅ Авто-расчет Total Amount
8. ✅ Improvement Timeline интеграция
9. ✅ Валидация форм
10. ✅ Error handling

---

## 🔄 Что можно добавить в будущем

1. **File Upload** для invoice documents
2. **Inline editing** items в edit mode
3. **Фильтрация** инвойсов по типу/дате
4. **Export** в PDF/Excel
5. **Копирование** инвойса
6. **История изменений** инвойсов

---

## 🎯 Готово к использованию!

После применения SQL миграций (034 и 035) вся функциональность готова к работе.

**Нет ошибок линтера** ✅  
**Все компоненты созданы** ✅  
**Интеграция полная** ✅

