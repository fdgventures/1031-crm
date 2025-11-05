import { getSupabaseClient } from "@/lib/supabase";

export interface YearToDateMetrics {
  // Total value of all properties sold
  totalValuePropertySold: number;
  
  // Total amount received to QI (Qualified Intermediary - все кредиты в exchanges)
  totalAmountReceivedToQI: number;
  
  // Total exchangeable value of property acquired (покупки)
  totalExchangeableValueAcquired: number;
  
  // Funds returned to Exchanger - taxable boot
  fundsReturnedToExchanger: number;
  
  // Total value of funds sent from exchange accounts (все дебеты из exchanges)
  totalFundsSentFromExchange: number;
}

/**
 * Вычисляет Year to Date метрики для tax account за указанный период
 */
export async function calculateYearToDateMetrics(
  taxAccountId: number,
  startDate: string, // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
): Promise<YearToDateMetrics> {
  const supabase = getSupabaseClient();

  try {
    // 1. Получаем все exchanges для этого tax account
    const { data: exchanges, error: exchangesError } = await supabase
      .from("exchanges")
      .select("id")
      .eq("tax_account_id", taxAccountId);

    if (exchangesError) {
      console.error("Failed to fetch exchanges:", exchangesError);
      return getEmptyMetrics();
    }

    const exchangeIds = (exchanges || []).map(e => e.id);

    if (exchangeIds.length === 0) {
      return getEmptyMetrics();
    }

    // 2. Получаем все accounting entries для этих exchanges за период
    const { data: entries, error: entriesError } = await supabase
      .from("accounting_entries")
      .select("*")
      .or(`to_exchange_id.in.(${exchangeIds.join(",")}),from_exchange_id.in.(${exchangeIds.join(",")})`)
      .gte("date", startDate)
      .lte("date", endDate);

    if (entriesError) {
      console.error("Failed to fetch accounting entries:", entriesError);
      return getEmptyMetrics();
    }

    const allEntries = entries || [];

    // 3. Total Value of Property Sold
    // Сумма всех sale_proceeds (кредиты, полученные от продажи)
    const totalValuePropertySold = allEntries
      .filter(
        (entry) =>
          exchangeIds.includes(entry.to_exchange_id as number) &&
          entry.entry_type === "sale_proceeds"
      )
      .reduce((sum, entry) => sum + (entry.credit || 0), 0);

    // 4. Total Amount Received to QI
    // Сумма ВСЕХ кредитов во все exchanges (деньги, полученные QI)
    const totalAmountReceivedToQI = allEntries
      .filter((entry) => exchangeIds.includes(entry.to_exchange_id as number))
      .reduce((sum, entry) => sum + (entry.credit || 0), 0);

    // 5. Total Exchangeable Value of Property Acquired
    // Сумма всех purchase_funds (дебеты на покупки)
    const totalExchangeableValueAcquired = allEntries
      .filter(
        (entry) =>
          exchangeIds.includes(entry.from_exchange_id as number) &&
          entry.entry_type === "purchase_funds"
      )
      .reduce((sum, entry) => sum + (entry.debit || 0), 0);

    // 6. Total Funds Sent from Exchange Account
    // Сумма ВСЕХ дебетов из exchanges (деньги, отправленные из QI)
    const totalFundsSentFromExchange = allEntries
      .filter((entry) => exchangeIds.includes(entry.from_exchange_id as number))
      .reduce((sum, entry) => sum + (entry.debit || 0), 0);

    // 7. Funds Returned to Exchanger (Taxable Boot)
    // Это разница между полученным и потраченным
    // Boot = Деньги получены - Деньги потрачены на покупки
    // НО: мы должны учитывать, что fees - это не boot
    // Boot = Total Received - Total Purchased - Fees
    const totalFees = allEntries
      .filter(
        (entry) =>
          exchangeIds.includes(entry.from_exchange_id as number) &&
          entry.entry_type === "fees"
      )
      .reduce((sum, entry) => sum + (entry.debit || 0), 0);

    const fundsReturnedToExchanger = Math.max(
      0,
      totalAmountReceivedToQI - totalExchangeableValueAcquired - totalFees
    );

    return {
      totalValuePropertySold,
      totalAmountReceivedToQI,
      totalExchangeableValueAcquired,
      fundsReturnedToExchanger,
      totalFundsSentFromExchange,
    };
  } catch (error) {
    console.error("Error calculating YTD metrics:", error);
    return getEmptyMetrics();
  }
}

/**
 * Вычисляет YTD метрики за текущий год
 */
export async function calculateCurrentYearMetrics(
  taxAccountId: number
): Promise<YearToDateMetrics> {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  
  return calculateYearToDateMetrics(taxAccountId, startDate, endDate);
}

/**
 * Вычисляет YTD метрики за указанный год
 */
export async function calculateYearMetrics(
  taxAccountId: number,
  year: number
): Promise<YearToDateMetrics> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  
  return calculateYearToDateMetrics(taxAccountId, startDate, endDate);
}

function getEmptyMetrics(): YearToDateMetrics {
  return {
    totalValuePropertySold: 0,
    totalAmountReceivedToQI: 0,
    totalExchangeableValueAcquired: 0,
    fundsReturnedToExchanger: 0,
    totalFundsSentFromExchange: 0,
  };
}

