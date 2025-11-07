import { getSupabaseClient } from "./supabase";

export interface EATInvoice {
  id: number;
  eat_parked_file_id: number;
  invoice_type: "Invoice paid through exchange" | "Invoice paid outside of exchange";
  paid_to: string;
  invoice_date: string;
  invoice_number: string | null;
  invoice_document_path: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EATInvoiceItem {
  id: number;
  eat_invoice_id: number;
  property_id: number | null;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  property?: {
    id: number;
    address: string;
  };
}

export interface EATInvoiceWithItems extends EATInvoice {
  items: EATInvoiceItem[];
}

export interface CreateEATInvoiceInput {
  eat_parked_file_id: number;
  invoice_type: "Invoice paid through exchange" | "Invoice paid outside of exchange";
  paid_to: string;
  invoice_date: string;
  invoice_number?: string;
  items: Array<{
    property_id?: number;
    description: string;
    amount: number;
  }>;
}

export interface UpdateEATInvoiceInput {
  invoice_type?: "Invoice paid through exchange" | "Invoice paid outside of exchange";
  paid_to?: string;
  invoice_date?: string;
  invoice_number?: string;
}

/**
 * Get all invoices for an EAT Parked File
 */
export async function getEATInvoices(
  eatParkedFileId: number
): Promise<EATInvoiceWithItems[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_invoices")
    .select(
      `
      *,
      items:eat_invoice_items (
        id,
        eat_invoice_id,
        property_id,
        description,
        amount,
        created_at,
        updated_at,
        property:property_id (
          id,
          address
        )
      )
    `
    )
    .eq("eat_parked_file_id", eatParkedFileId)
    .order("invoice_date", { ascending: false });

  if (error) {
    console.error("Error loading EAT invoices:", error);
    return [];
  }

  return (data || []) as EATInvoiceWithItems[];
}

/**
 * Get single invoice with items
 */
export async function getEATInvoice(
  invoiceId: number
): Promise<EATInvoiceWithItems | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_invoices")
    .select(
      `
      *,
      items:eat_invoice_items (
        id,
        eat_invoice_id,
        property_id,
        description,
        amount,
        created_at,
        updated_at,
        property:property_id (
          id,
          address
        )
      )
    `
    )
    .eq("id", invoiceId)
    .single();

  if (error) {
    console.error("Error loading EAT invoice:", error);
    return null;
  }

  return data as EATInvoiceWithItems;
}

/**
 * Create new invoice with items
 */
export async function createEATInvoice(
  input: CreateEATInvoiceInput
): Promise<{ success: boolean; id?: number; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("eat_invoices")
      .insert({
        eat_parked_file_id: input.eat_parked_file_id,
        invoice_type: input.invoice_type,
        paid_to: input.paid_to,
        invoice_date: input.invoice_date,
        invoice_number: input.invoice_number || null,
      })
      .select("id")
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      throw invoiceError;
    }

    // Create invoice items
    if (input.items.length > 0) {
      const itemsToInsert = input.items.map((item) => ({
        eat_invoice_id: invoice.id,
        property_id: item.property_id || null,
        description: item.description,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from("eat_invoice_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error creating invoice items:", itemsError);
        throw itemsError;
      }
    }

    return { success: true, id: invoice.id };
  } catch (error: unknown) {
    console.error("Error creating EAT invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update invoice
 */
export async function updateEATInvoice(
  invoiceId: number,
  updates: UpdateEATInvoiceInput
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_invoices")
    .update(updates)
    .eq("id", invoiceId);

  if (error) {
    console.error("Error updating EAT invoice:", error);
    return false;
  }

  return true;
}

/**
 * Delete invoice (cascade will delete items automatically)
 */
export async function deleteEATInvoice(invoiceId: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_invoices")
    .delete()
    .eq("id", invoiceId);

  if (error) {
    console.error("Error deleting EAT invoice:", error);
    return false;
  }

  return true;
}

/**
 * Add item to invoice
 */
export async function addEATInvoiceItem(
  invoiceId: number,
  item: {
    property_id?: number;
    description: string;
    amount: number;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("eat_invoice_items").insert({
    eat_invoice_id: invoiceId,
    property_id: item.property_id || null,
    description: item.description,
    amount: item.amount,
  });

  if (error) {
    console.error("Error adding invoice item:", error);
    return false;
  }

  return true;
}

/**
 * Update invoice item
 */
export async function updateEATInvoiceItem(
  itemId: number,
  updates: {
    property_id?: number | null;
    description?: string;
    amount?: number;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_invoice_items")
    .update(updates)
    .eq("id", itemId);

  if (error) {
    console.error("Error updating invoice item:", error);
    return false;
  }

  return true;
}

/**
 * Delete invoice item
 */
export async function deleteEATInvoiceItem(itemId: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_invoice_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting invoice item:", error);
    return false;
  }

  return true;
}

/**
 * Get properties from EAT Acquisition transactions for invoice items
 */
export async function getEATAcquisitionProperties(
  eatParkedFileId: number
): Promise<Array<{ id: number; address: string }>> {
  const supabase = getSupabaseClient();

  // Get transactions of type "EAT Acquisition"
  const { data: eatTransactions, error: transError } = await supabase
    .from("eat_transactions")
    .select("transaction_id")
    .eq("eat_parked_file_id", eatParkedFileId)
    .eq("transaction_type", "EAT Acquisition");

  if (transError || !eatTransactions || eatTransactions.length === 0) {
    return [];
  }

  const transactionIds = eatTransactions.map((t) => t.transaction_id);

  // Get properties from these transactions
  const { data: properties, error: propError } = await supabase
    .from("property_ownership")
    .select(
      `
      property:property_id (
        id,
        address
      )
    `
    )
    .in("transaction_id", transactionIds);

  if (propError) {
    console.error("Error loading acquisition properties:", propError);
    return [];
  }

  // Extract unique properties
  const uniqueProperties = new Map<number, { id: number; address: string }>();
  
  properties?.forEach((item: { property?: { id: number; address: string } | Array<{ id: number; address: string }> }) => {
    if (item.property) {
      const prop = Array.isArray(item.property) ? item.property[0] : item.property;
      if (prop && prop.id) {
        uniqueProperties.set(prop.id, prop);
      }
    }
  });

  return Array.from(uniqueProperties.values());
}

