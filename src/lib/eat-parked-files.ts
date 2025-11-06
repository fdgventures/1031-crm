import { getSupabaseClient } from "./supabase";

export interface EATParkedFile {
  id: number;
  eat_number: string;
  eat_name: string;
  eat_llc_id: number | null;
  total_acquired_property_value: number;
  total_invoice_value: number;
  total_parked_property_value: number;
  total_sale_property_value: number;
  value_remaining: number;
  day_45_date: string | null;
  day_180_date: string | null;
  close_date: string | null;
  status: "pending" | "active" | "completed" | "cancelled";
  state: string;
  qi_company_id: string | null;
  improvement_start_date: string | null;
  improvement_estimated_completion_date: string | null;
  improvement_actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EATParkedFileWithRelations extends EATParkedFile {
  eat_llc?: {
    id: number;
    company_name: string;
    state_formation: string;
    licensed_in: string | null;
  };
  exchangors?: Array<{
    id: number;
    tax_account: {
      id: number;
      name: string;
      account_number: string | null;
    };
  }>;
  secretary_of_state?: {
    id: number;
    transfer_type: string | null;
    eat_transfer_to_exchangor_transaction_date: string | null;
    eat_sos_status: string | null;
    eat_client_touchback_date: string | null;
    eat_sos_dissolve_transfer_date: string | null;
  } | null;
  lender?: {
    id: number;
    loan_to_value_ratio: string | null;
    lender_business_card_id: number | null;
    lender_note_amount: number | null;
    lender_note_date: string | null;
    lender_document_path: string | null;
    business_card?: {
      id: number;
      business_name: string;
      email: string;
    } | null;
  } | null;
}

export interface CreateEATParkedFileInput {
  eat_name: string;
  eat_llc_id: number;
  state: string;
  date_of_formation: string;
  exchangor_tax_account_ids: number[];
}

/**
 * Get EAT Parked File by ID with all relations
 */
export async function getEATParkedFile(
  id: number
): Promise<EATParkedFileWithRelations | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_parked_files")
    .select(
      `
      *,
      eat_llc:eat_llc_id (
        id,
        company_name,
        state_formation,
        licensed_in
      ),
      exchangors:eat_exchangors (
        id,
        tax_account:tax_account_id (
          id,
          name,
          account_number
        )
      ),
      eat_secretary_of_state (
        id,
        transfer_type,
        eat_transfer_to_exchangor_transaction_date,
        eat_sos_status,
        eat_client_touchback_date,
        eat_sos_dissolve_transfer_date
      ),
      eat_lenders (
        id,
        loan_to_value_ratio,
        lender_business_card_id,
        lender_note_amount,
        lender_note_date,
        lender_document_path,
        business_card:lender_business_card_id (
          id,
          business_name,
          email
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading EAT Parked File:", error, "Details:", JSON.stringify(error, null, 2));
    return null;
  }

  // Transform array responses to single objects for one-to-one relationships
  const result = data as any;
  if (result) {
    // eat_secretary_of_state and eat_lenders are arrays, get first element
    if (result.eat_secretary_of_state) {
      result.secretary_of_state = Array.isArray(result.eat_secretary_of_state) 
        ? result.eat_secretary_of_state[0] || null
        : result.eat_secretary_of_state;
      delete result.eat_secretary_of_state;
    }
    if (result.eat_lenders) {
      result.lender = Array.isArray(result.eat_lenders)
        ? result.eat_lenders[0] || null
        : result.eat_lenders;
      delete result.eat_lenders;
    }
  }

  return result as EATParkedFileWithRelations;
}

/**
 * Create new EAT Parked File
 */
export async function createEATParkedFile(
  input: CreateEATParkedFileInput
): Promise<{ success: boolean; id?: number; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // Get tax account name for generating EAT number
    const { data: taxAccountData, error: taxAccountError } = await supabase
      .from("tax_accounts")
      .select("name")
      .eq("id", input.exchangor_tax_account_ids[0])
      .single();

    if (taxAccountError) throw taxAccountError;

    // Generate EAT number
    const year = new Date(input.date_of_formation).getFullYear();
    const { data: eatNumberData, error: eatNumberError } = await supabase.rpc(
      "generate_eat_parked_file_number",
      {
        tax_account_name: taxAccountData.name,
        state_code: input.state,
        formation_year: year,
      }
    );

    if (eatNumberError) throw eatNumberError;

    // Create EAT Parked File
    const { data: eatData, error: eatError } = await supabase
      .from("eat_parked_files")
      .insert({
        eat_number: eatNumberData as string,
        eat_name: input.eat_name,
        eat_llc_id: input.eat_llc_id,
        state: input.state,
        close_date: input.date_of_formation,
        status: "pending",
      })
      .select("id")
      .single();

    if (eatError) throw eatError;

    // Add exchangors
    const exchangorsToInsert = input.exchangor_tax_account_ids.map(
      (taxAccountId) => ({
        eat_parked_file_id: eatData.id,
        tax_account_id: taxAccountId,
      })
    );

    const { error: exchangorsError } = await supabase
      .from("eat_exchangors")
      .insert(exchangorsToInsert);

    if (exchangorsError) {
      console.error("Error creating exchangors:", exchangorsError);
      throw exchangorsError;
    }

    // Create empty secretary of state record
    const { error: sosError } = await supabase
      .from("eat_secretary_of_state")
      .insert({
        eat_parked_file_id: eatData.id,
      });

    if (sosError) {
      console.error("Error creating secretary of state:", sosError);
      throw sosError;
    }

    // Create empty lender record
    const { error: lenderError } = await supabase.from("eat_lenders").insert({
      eat_parked_file_id: eatData.id,
    });

    if (lenderError) {
      console.error("Error creating lender:", lenderError);
      throw lenderError;
    }

    console.log("EAT Parked File created successfully:", eatData.id);
    return { success: true, id: eatData.id };
  } catch (error: unknown) {
    console.error("Error creating EAT Parked File:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update EAT Parked File
 */
export async function updateEATParkedFile(
  id: number,
  updates: Partial<EATParkedFile>
): Promise<boolean> {
  const supabase = getSupabaseClient();

  console.log("Updating EAT Parked File:", id, "with:", updates);

  const { error } = await supabase
    .from("eat_parked_files")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating EAT Parked File:", error, "Details:", JSON.stringify(error, null, 2));
    return false;
  }

  console.log("EAT Parked File updated successfully");
  return true;
}

/**
 * Update Secretary of State information
 */
export async function updateSecretaryOfState(
  eatParkedFileId: number,
  updates: {
    transfer_type?: string | null;
    eat_transfer_to_exchangor_transaction_date?: string | null;
    eat_sos_status?: string | null;
    eat_client_touchback_date?: string | null;
    eat_sos_dissolve_transfer_date?: string | null;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_secretary_of_state")
    .update(updates)
    .eq("eat_parked_file_id", eatParkedFileId);

  if (error) {
    console.error("Error updating Secretary of State:", error);
    return false;
  }

  return true;
}

/**
 * Update Lender information
 */
export async function updateLenderInformation(
  eatParkedFileId: number,
  updates: {
    loan_to_value_ratio?: string | null;
    lender_business_card_id?: number | null;
    lender_note_amount?: number | null;
    lender_note_date?: string | null;
    lender_document_path?: string | null;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_lenders")
    .update(updates)
    .eq("eat_parked_file_id", eatParkedFileId);

  if (error) {
    console.error("Error updating Lender information:", error);
    return false;
  }

  return true;
}

/**
 * Get all EAT LLCs with their licensed states
 */
export async function getEATLLCsForSelection(): Promise<
  Array<{
    id: number;
    company_name: string;
    state_formation: string;
    licensed_in: string | null;
    status: string;
  }>
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_llcs")
    .select("id, company_name, state_formation, licensed_in, status")
    .eq("status", "Active")
    .order("company_name");

  if (error) {
    console.error("Error loading EAT LLCs:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all Business Cards for selection
 */
export async function getBusinessCardsForSelection(): Promise<
  Array<{
    id: number;
    business_name: string;
    email: string;
  }>
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("business_cards")
    .select("id, business_name, email")
    .order("business_name");

  if (error) {
    console.error("Error loading Business Cards:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all Tax Accounts for selection
 */
export async function getTaxAccountsForSelection(): Promise<
  Array<{
    id: number;
    name: string;
    account_number: string | null;
  }>
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("tax_accounts")
    .select("id, name, account_number")
    .order("name");

  if (error) {
    console.error("Error loading Tax Accounts:", error);
    return [];
  }

  return data || [];
}

/**
 * Add exchangor to EAT Parked File
 */
export async function addExchangor(
  eatParkedFileId: number,
  taxAccountId: number
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("eat_exchangors").insert({
    eat_parked_file_id: eatParkedFileId,
    tax_account_id: taxAccountId,
  });

  if (error) {
    console.error("Error adding exchangor:", error);
    return false;
  }

  return true;
}

/**
 * Remove exchangor from EAT Parked File
 */
export async function removeExchangor(exchangorId: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_exchangors")
    .delete()
    .eq("id", exchangorId);

  if (error) {
    console.error("Error removing exchangor:", error);
    return false;
  }

  return true;
}

