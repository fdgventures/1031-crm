import { getSupabaseClient } from "@/lib/supabase";

export interface TaxAccountExchange {
  id: number;
  exchange_number: string;
  status?: string | null;
  created_at: string;
  
  // Dates
  relinquished_close_date?: string | null;
  day_45_date?: string | null;
  day_180_date?: string | null;
  
  // Financial metrics (auto-calculated)
  totalSaleValue: number;
  totalReplacementValue: number;
  valueRemaining: number;
  
  // Transaction counts
  saleTransactionsCount: number;
  purchaseTransactionsCount: number;
  
  // Properties count
  identifiedPropertiesCount: number;
  
  // Current balance
  currentBalance: number;
}

/**
 * Загружает все exchanges для tax account с ключевыми метриками
 */
export async function loadTaxAccountExchanges(
  taxAccountId: number
): Promise<TaxAccountExchange[]> {
  const supabase = getSupabaseClient();

  try {
    // 1. Получаем все exchanges
    const { data: exchanges, error: exchangesError } = await supabase
      .from("exchanges")
      .select("*")
      .eq("tax_account_id", taxAccountId)
      .order("created_at", { ascending: false });

    if (exchangesError) {
      console.error("Failed to fetch exchanges:", exchangesError);
      return [];
    }

    if (!exchanges || exchanges.length === 0) {
      return [];
    }

    const exchangeIds = exchanges.map(e => e.id);

    // 2. Загружаем данные параллельно
    const [
      accountingEntriesResult,
      exchangeTransactionsResult,
      identifiedPropertiesResult
    ] = await Promise.all([
      // Accounting entries
      supabase
        .from("accounting_entries")
        .select("exchange_id:to_exchange_id, credit, debit, from_exchange_id, to_exchange_id, entry_type")
        .or(`to_exchange_id.in.(${exchangeIds.join(",")}),from_exchange_id.in.(${exchangeIds.join(",")})`),
      
      // Exchange transactions
      supabase
        .from("exchange_transactions")
        .select("exchange_id, transaction_type")
        .in("exchange_id", exchangeIds),
      
      // Identified properties
      supabase
        .from("identified_properties")
        .select("exchange_id")
        .in("exchange_id", exchangeIds)
    ]);

    // 3. Создаем Maps для быстрого доступа
    const accountingMap = new Map<number, any[]>();
    const transactionsMap = new Map<number, { sales: number; purchases: number }>();
    const propertiesMap = new Map<number, number>();

    // Accounting entries
    (accountingEntriesResult.data || []).forEach((entry: any) => {
      // Credits (к exchange)
      if (entry.to_exchange_id && exchangeIds.includes(entry.to_exchange_id)) {
        if (!accountingMap.has(entry.to_exchange_id)) {
          accountingMap.set(entry.to_exchange_id, []);
        }
        accountingMap.get(entry.to_exchange_id)!.push({ ...entry, direction: 'credit' });
      }
      // Debits (из exchange)
      if (entry.from_exchange_id && exchangeIds.includes(entry.from_exchange_id)) {
        if (!accountingMap.has(entry.from_exchange_id)) {
          accountingMap.set(entry.from_exchange_id, []);
        }
        accountingMap.get(entry.from_exchange_id)!.push({ ...entry, direction: 'debit' });
      }
    });

    // Exchange transactions counts
    (exchangeTransactionsResult.data || []).forEach((et: any) => {
      if (!transactionsMap.has(et.exchange_id)) {
        transactionsMap.set(et.exchange_id, { sales: 0, purchases: 0 });
      }
      const counts = transactionsMap.get(et.exchange_id)!;
      if (et.transaction_type === 'Sale') {
        counts.sales++;
      } else {
        counts.purchases++;
      }
    });

    // Identified properties counts
    (identifiedPropertiesResult.data || []).forEach((prop: any) => {
      propertiesMap.set(
        prop.exchange_id,
        (propertiesMap.get(prop.exchange_id) || 0) + 1
      );
    });

    // 4. Формируем результат с метриками
    const result: TaxAccountExchange[] = exchanges.map((exchange) => {
      const entries = accountingMap.get(exchange.id) || [];
      
      // Рассчитываем финансовые метрики
      const totalSaleValue = entries
        .filter(e => e.direction === 'credit' && e.entry_type === 'sale_proceeds')
        .reduce((sum, e) => sum + (e.credit || 0), 0);
      
      const totalReplacementValue = entries
        .filter(e => e.direction === 'debit' && e.entry_type === 'purchase_funds')
        .reduce((sum, e) => sum + (e.debit || 0), 0);
      
      const valueRemaining = totalSaleValue - totalReplacementValue;
      
      // Текущий баланс (все credits - все debits)
      const totalCredits = entries
        .filter(e => e.direction === 'credit')
        .reduce((sum, e) => sum + (e.credit || 0), 0);
      
      const totalDebits = entries
        .filter(e => e.direction === 'debit')
        .reduce((sum, e) => sum + (e.debit || 0), 0);
      
      const currentBalance = totalCredits - totalDebits;
      
      // Counts
      const txCounts = transactionsMap.get(exchange.id) || { sales: 0, purchases: 0 };
      const propertiesCount = propertiesMap.get(exchange.id) || 0;

      return {
        id: exchange.id,
        exchange_number: exchange.exchange_number,
        status: exchange.status,
        created_at: exchange.created_at,
        relinquished_close_date: exchange.relinquished_close_date,
        day_45_date: exchange.day_45_date,
        day_180_date: exchange.day_180_date,
        totalSaleValue,
        totalReplacementValue,
        valueRemaining,
        saleTransactionsCount: txCounts.sales,
        purchaseTransactionsCount: txCounts.purchases,
        identifiedPropertiesCount: propertiesCount,
        currentBalance,
      };
    });

    return result;
  } catch (error) {
    console.error("Error loading tax account exchanges:", error);
    return [];
  }
}

