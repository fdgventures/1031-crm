import { getSupabaseClient } from "@/lib/supabase";

export interface ExchangeFinancials {
  totalSalePropertyValue: number;
  totalReplacementProperty: number;
  valueRemaining: number;
}

/**
 * Автоматически вычисляет финансовые показатели exchange на основе accounting entries
 */
export async function calculateExchangeFinancials(
  exchangeId: number
): Promise<ExchangeFinancials> {
  const supabase = getSupabaseClient();

  // Получаем все accounting entries для этого exchange
  const { data: entries, error } = await supabase
    .from("accounting_entries")
    .select("credit, debit, entry_type, to_exchange_id, from_exchange_id")
    .or(`to_exchange_id.eq.${exchangeId},from_exchange_id.eq.${exchangeId}`);

  if (error) {
    console.error("Failed to fetch accounting entries:", error);
    return {
      totalSalePropertyValue: 0,
      totalReplacementProperty: 0,
      valueRemaining: 0,
    };
  }

  // Total Sale Property Value - деньги, полученные от продажи (credits в to_exchange_id)
  const totalSalePropertyValue = (entries || [])
    .filter(
      (entry) =>
        entry.to_exchange_id === exchangeId &&
        (entry.entry_type === "sale_proceeds" || entry.credit > 0)
    )
    .reduce((sum, entry) => sum + (entry.credit || 0), 0);

  // Total Replacement Property - деньги, потраченные на покупку (debits из from_exchange_id)
  const totalReplacementProperty = (entries || [])
    .filter(
      (entry) =>
        entry.from_exchange_id === exchangeId &&
        (entry.entry_type === "purchase_funds" || entry.debit > 0)
    )
    .reduce((sum, entry) => sum + (entry.debit || 0), 0);

  // Value Remaining - сколько еще нужно реинвестировать
  const valueRemaining = totalSalePropertyValue - totalReplacementProperty;

  return {
    totalSalePropertyValue,
    totalReplacementProperty,
    valueRemaining,
  };
}

/**
 * Обновляет поля exchange с вычисленными значениями
 * Можно использовать для синхронизации сохраненных значений с вычисленными
 */
export async function updateExchangeFinancials(
  exchangeId: number
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const financials = await calculateExchangeFinancials(exchangeId);

  const { error } = await supabase
    .from("exchanges")
    .update({
      total_sale_property_value: financials.totalSalePropertyValue,
      total_replacement_property: financials.totalReplacementProperty,
      value_remaining: financials.valueRemaining,
    })
    .eq("id", exchangeId);

  if (error) {
    console.error("Failed to update exchange financials:", error);
    return false;
  }

  return true;
}

/**
 * Получает текущий баланс exchange (кредит - дебет)
 */
export async function getExchangeBalance(exchangeId: number): Promise<number> {
  const supabase = getSupabaseClient();

  const { data: entries, error } = await supabase
    .from("accounting_entries")
    .select("credit, debit, to_exchange_id, from_exchange_id")
    .or(`to_exchange_id.eq.${exchangeId},from_exchange_id.eq.${exchangeId}`);

  if (error) {
    console.error("Failed to fetch accounting entries for balance:", error);
    return 0;
  }

  const totalCredit = (entries || [])
    .filter((entry) => entry.to_exchange_id === exchangeId)
    .reduce((sum, entry) => sum + (entry.credit || 0), 0);

  const totalDebit = (entries || [])
    .filter((entry) => entry.from_exchange_id === exchangeId)
    .reduce((sum, entry) => sum + (entry.debit || 0), 0);

  return totalCredit - totalDebit;
}

