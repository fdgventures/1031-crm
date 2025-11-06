import { getSupabaseClient } from "@/lib/supabase";

export interface TransactionParty {
  id: number;
  name: string;
  percent: number;
}

export interface TaxAccountTransaction {
  id: number;
  transaction_number: string;
  transaction_type: "Sale" | "Purchase";
  status?: string | null;
  contract_purchase_price: number;
  contract_date: string;
  actual_close_date?: string | null;
  estimated_close_date?: string | null;
  sale_type: "Property" | "Entity";
  
  // Exchange information
  exchange_id?: number;
  exchange_number?: string;
  
  // Property information
  property_address?: string;
  
  // Parties
  sellers: TransactionParty[];
  buyers: TransactionParty[];
  
  // Financial details from settlement
  total_value?: number;
  percent_sold?: number;
  sales_price?: number;
  funds_received?: number;
  balance_available?: number;
  funds_to_exchange?: number;
  funds_from_exchange?: number;
}

export interface GroupedTransactions {
  // Транзакции, сгруппированные по exchanges
  exchangeGroups: Map<number, {
    exchangeId: number;
    exchangeNumber: string;
    sales: TaxAccountTransaction[];
    purchases: TaxAccountTransaction[];
  }>;
  
  // Транзакции без exchange (не должно быть для tax account, но на всякий случай)
  orphanSales: TaxAccountTransaction[];
  orphanPurchases: TaxAccountTransaction[];
}

/**
 * Загружает все транзакции для tax account, сгруппированные по exchanges
 */
export async function loadTaxAccountTransactions(
  taxAccountId: number
): Promise<GroupedTransactions> {
  const supabase = getSupabaseClient();

  try {
    // 1. Получаем все exchanges для этого tax account
    const { data: exchanges, error: exchangesError } = await supabase
      .from("exchanges")
      .select("id, exchange_number")
      .eq("tax_account_id", taxAccountId);

    if (exchangesError) {
      console.error("Failed to fetch exchanges:", exchangesError);
      return getEmptyGroups();
    }

    const exchangeIds = (exchanges || []).map(e => e.id);

    if (exchangeIds.length === 0) {
      return getEmptyGroups();
    }

    // 2. Получаем все exchange_transactions для этих exchanges
    const { data: exchangeTransactions, error: etError } = await supabase
      .from("exchange_transactions")
      .select(`
        id,
        exchange_id,
        transaction_id,
        transaction_type,
        transaction:transaction_id (
          id,
          transaction_number,
          contract_purchase_price,
          contract_date,
          actual_close_date,
          estimated_close_date,
          status,
          sale_type
        )
      `)
      .in("exchange_id", exchangeIds);

    if (etError) {
      console.error("Failed to fetch exchange transactions:", etError);
      return getEmptyGroups();
    }

    const transactionIds = (exchangeTransactions || [])
      .map(et => (et.transaction as unknown as {id: number} | null)?.id)
      .filter(Boolean) as number[];

    if (transactionIds.length === 0) {
      return getEmptyGroups();
    }

    // 3. Получаем sellers и buyers для всех транзакций
    const [sellersResult, buyersResult, propertiesResult, settlementsResult] = await Promise.all([
      supabase
        .from("transaction_sellers")
        .select(`
          id,
          transaction_id,
          vesting_name,
          non_exchange_name,
          contract_percent,
          tax_account:tax_account_id (id, name)
        `)
        .in("transaction_id", transactionIds),
      
      supabase
        .from("transaction_buyers")
        .select(`
          id,
          transaction_id,
          non_exchange_name,
          contract_percent,
          profile:profile_id (id, first_name, last_name)
        `)
        .in("transaction_id", transactionIds),
      
      supabase
        .from("properties")
        .select("id, address, transaction_id")
        .in("transaction_id", transactionIds),
      
      supabase
        .from("settlement_sellers")
        .select(`
          id,
          transaction_id,
          balance,
          closing_cost,
          debt_payoff,
          funds_to_exchange,
          funds_to_exchanger,
          sale_price
        `)
        .in("transaction_id", transactionIds)
    ]);

    interface SellerData {
      id: number;
      transaction_id: number;
      vesting_name?: string | null;
      non_exchange_name?: string | null;
      contract_percent?: number | null;
      tax_account?: {id: number; name: string}[] | {id: number; name: string} | null;
    }
    
    interface BuyerData {
      id: number;
      transaction_id: number;
      non_exchange_name?: string | null;
      contract_percent?: number | null;
      profile?: {id: number; first_name: string; last_name: string}[] | {id: number; first_name: string; last_name: string} | null;
    }
    
    interface PropertyData {
      id: number;
      address: string;
      transaction_id: number;
    }
    
    interface SettlementData {
      transaction_id: number;
      balance?: number | null;
      closing_cost?: number | null;
      debt_payoff?: number | null;
      funds_to_exchange?: number | null;
      funds_to_exchanger?: number | null;
      sale_price?: number | null;
    }

    // 4. Создаем Map для быстрого доступа
    const sellersMap = new Map<number, SellerData[]>();
    const buyersMap = new Map<number, BuyerData[]>();
    const propertiesMap = new Map<number, PropertyData>();
    const settlementsMap = new Map<number, SettlementData[]>();

    (sellersResult.data || []).forEach(seller => {
      if (!sellersMap.has(seller.transaction_id)) {
        sellersMap.set(seller.transaction_id, []);
      }
      sellersMap.get(seller.transaction_id)!.push(seller);
    });

    (buyersResult.data || []).forEach(buyer => {
      if (!buyersMap.has(buyer.transaction_id)) {
        buyersMap.set(buyer.transaction_id, []);
      }
      buyersMap.get(buyer.transaction_id)!.push(buyer);
    });

    (propertiesResult.data || []).forEach(property => {
      if (property.transaction_id) {
        propertiesMap.set(property.transaction_id, property);
      }
    });

    (settlementsResult.data || []).forEach(settlement => {
      if (!settlementsMap.has(settlement.transaction_id)) {
        settlementsMap.set(settlement.transaction_id, []);
      }
      settlementsMap.get(settlement.transaction_id)!.push(settlement);
    });

    // 5. Группируем транзакции по exchanges
    const exchangeGroups = new Map<number, {
      exchangeId: number;
      exchangeNumber: string;
      sales: TaxAccountTransaction[];
      purchases: TaxAccountTransaction[];
    }>();

    // Инициализируем группы для всех exchanges
    exchanges.forEach(exchange => {
      exchangeGroups.set(exchange.id, {
        exchangeId: exchange.id,
        exchangeNumber: exchange.exchange_number,
        sales: [],
        purchases: [],
      });
    });

    // 6. Обрабатываем каждую транзакцию
    (exchangeTransactions || []).forEach(et => {
      const transaction = et.transaction as unknown as {
        id: number;
        transaction_number: string;
        contract_purchase_price: number;
        contract_date: string;
        actual_close_date?: string | null;
        estimated_close_date?: string | null;
        status?: string | null;
        sale_type: "Property" | "Entity";
      } | null;
      if (!transaction) return;

      const sellers = (sellersMap.get(transaction.id) || []).map(s => ({
        id: s.id,
        name: s.vesting_name || s.non_exchange_name || 
              (Array.isArray(s.tax_account) ? s.tax_account[0]?.name : s.tax_account?.name) || "Unknown",
        percent: s.contract_percent || 0,
      }));

      const buyers = (buyersMap.get(transaction.id) || []).map(b => {
        let profileName = "Unknown";
        if (b.profile) {
          if (Array.isArray(b.profile)) {
            profileName = b.profile[0] ? `${b.profile[0].first_name} ${b.profile[0].last_name}` : "Unknown";
          } else {
            profileName = `${b.profile.first_name} ${b.profile.last_name}`;
          }
        }
        return {
          id: b.id,
          name: b.non_exchange_name || profileName,
          percent: b.contract_percent || 0,
        };
      });

      const property = propertiesMap.get(transaction.id);
      const settlements = settlementsMap.get(transaction.id) || [];
      
      // Агрегируем settlement данные
      const totalFundsToExchange = settlements.reduce((sum: number, s) => 
        sum + (s.funds_to_exchange || 0), 0);
      const totalSalesPrice = settlements.reduce((sum: number, s) => 
        sum + (s.sale_price || 0), 0);

      const txData: TaxAccountTransaction = {
        id: transaction.id,
        transaction_number: transaction.transaction_number,
        transaction_type: et.transaction_type as "Sale" | "Purchase",
        status: transaction.status,
        contract_purchase_price: transaction.contract_purchase_price,
        contract_date: transaction.contract_date,
        actual_close_date: transaction.actual_close_date,
        estimated_close_date: transaction.estimated_close_date,
        sale_type: transaction.sale_type,
        exchange_id: et.exchange_id,
        exchange_number: exchanges.find(e => e.id === et.exchange_id)?.exchange_number,
        property_address: property?.address,
        sellers,
        buyers,
        funds_to_exchange: totalFundsToExchange,
        sales_price: totalSalesPrice,
        total_value: transaction.contract_purchase_price,
      };

      const group = exchangeGroups.get(et.exchange_id);
      if (group) {
        if (et.transaction_type === "Sale") {
          group.sales.push(txData);
        } else {
          group.purchases.push(txData);
        }
      }
    });

    return {
      exchangeGroups,
      orphanSales: [],
      orphanPurchases: [],
    };
  } catch (error) {
    console.error("Error loading tax account transactions:", error);
    return getEmptyGroups();
  }
}

function getEmptyGroups(): GroupedTransactions {
  return {
    exchangeGroups: new Map(),
    orphanSales: [],
    orphanPurchases: [],
  };
}

