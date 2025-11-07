import { getSupabaseClient } from "./supabase";

export interface Entity {
  id: number;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityProfileAccess {
  id: number;
  entity_id: number;
  tax_account_id: number;
  relationship: "Manager" | "Trustee" | "Owner/Member" | "Managing Member" | "Beneficiary";
  has_signing_authority: boolean;
  is_main_contact: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  tax_account?: {
    id: number;
    name: string;
    account_number: string | null;
    profile?: {
      id: number;
      first_name: string;
      last_name: string;
      email: string | null;
    };
  };
}

export interface EntityWithAccess extends Entity {
  profile_accesses?: EntityProfileAccess[];
}

/**
 * Get all entities
 */
export async function getAllEntities(): Promise<Entity[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("entities")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error loading entities:", error);
    return [];
  }

  return data || [];
}

/**
 * Get entity by ID with profile accesses
 */
export async function getEntity(id: number): Promise<EntityWithAccess | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("entities")
    .select(
      `
      *,
      profile_accesses:entity_profile_access (
        id,
        entity_id,
        tax_account_id,
        relationship,
        has_signing_authority,
        is_main_contact,
        created_at,
        updated_at,
        created_by,
        tax_account:tax_account_id (
          id,
          name,
          account_number,
          profile:profile_id (
            id,
            first_name,
            last_name,
            email
          )
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error loading entity:", error);
    return null;
  }

  return data as EntityWithAccess;
}

/**
 * Create entity
 */
export async function createEntity(
  name: string,
  email?: string
): Promise<{ success: boolean; id?: number; error?: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("entities")
    .insert({
      name,
      email: email || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating entity:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true, id: data.id };
}

/**
 * Update entity
 */
export async function updateEntity(
  id: number,
  updates: { name?: string; email?: string | null }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("entities")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating entity:", error);
    return false;
  }

  return true;
}

/**
 * Delete entity
 */
export async function deleteEntity(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("entities").delete().eq("id", id);

  if (error) {
    console.error("Error deleting entity:", error);
    return false;
  }

  return true;
}

/**
 * Add profile access to entity
 */
export async function addEntityProfileAccess(
  entityId: number,
  taxAccountId: number,
  relationship: "Manager" | "Trustee" | "Owner/Member" | "Managing Member" | "Beneficiary",
  hasSigningAuthority: boolean = false,
  isMainContact: boolean = false
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("entity_profile_access").insert({
    entity_id: entityId,
    tax_account_id: taxAccountId,
    relationship,
    has_signing_authority: hasSigningAuthority,
    is_main_contact: isMainContact,
  });

  if (error) {
    console.error("Error adding entity profile access:", error);
    return false;
  }

  return true;
}

/**
 * Update profile access
 */
export async function updateEntityProfileAccess(
  accessId: number,
  updates: {
    relationship?: "Manager" | "Trustee" | "Owner/Member" | "Managing Member" | "Beneficiary";
    has_signing_authority?: boolean;
    is_main_contact?: boolean;
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("entity_profile_access")
    .update(updates)
    .eq("id", accessId);

  if (error) {
    console.error("Error updating entity profile access:", error);
    return false;
  }

  return true;
}

/**
 * Remove profile access
 */
export async function removeEntityProfileAccess(accessId: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("entity_profile_access")
    .delete()
    .eq("id", accessId);

  if (error) {
    console.error("Error removing entity profile access:", error);
    return false;
  }

  return true;
}

/**
 * Get tax accounts for entity
 */
export async function getEntityTaxAccounts(entityId: number) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("tax_accounts")
    .select("*")
    .eq("entity_id", entityId)
    .order("name");

  if (error) {
    console.error("Error loading entity tax accounts:", error);
    return [];
  }

  return data || [];
}

/**
 * Get properties owned by entity
 */
export async function getEntityProperties(entityId: number) {
  const supabase = getSupabaseClient();

  // Get tax accounts for this entity
  const { data: taxAccounts } = await supabase
    .from("tax_accounts")
    .select("id")
    .eq("entity_id", entityId);

  if (!taxAccounts || taxAccounts.length === 0) {
    return [];
  }

  const taxAccountIds = taxAccounts.map((ta) => ta.id);

  // Get properties through property_ownership
  const { data, error } = await supabase
    .from("property_ownership")
    .select(
      `
      property:property_id (
        id,
        address,
        city,
        state,
        zip,
        created_at
      ),
      transaction:transaction_id (
        id,
        transaction_number,
        contract_purchase_price,
        status
      )
    `
    )
    .in("tax_account_id", taxAccountIds);

  if (error) {
    console.error("Error loading entity properties:", error);
    return [];
  }

  // Extract unique properties
  interface PropertyOwnershipQueryResult {
    property?: unknown;
    transaction?: unknown;
  }
  
  const uniqueProperties = new Map();
  (data as PropertyOwnershipQueryResult[])?.forEach((item) => {
    const property = item.property;
    const prop = Array.isArray(property) ? property[0] : property;
    if (prop && typeof prop === 'object' && 'id' in prop && 'address' in prop) {
      const transaction = item.transaction;
      const trans = Array.isArray(transaction) ? transaction[0] : transaction;
      uniqueProperties.set((prop as { id: number }).id, {
        ...prop,
        transaction: trans,
      });
    }
  });

  return Array.from(uniqueProperties.values());
}

/**
 * Get transactions for entity
 */
export async function getEntityTransactions(entityId: number) {
  const supabase = getSupabaseClient();

  // Get tax accounts for this entity
  const { data: taxAccounts } = await supabase
    .from("tax_accounts")
    .select("id")
    .eq("entity_id", entityId);

  if (!taxAccounts || taxAccounts.length === 0) {
    return [];
  }

  const taxAccountIds = taxAccounts.map((ta) => ta.id);

  // Get transactions through sellers/buyers
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      sellers:transaction_sellers!inner (
        tax_account_id
      )
    `
    )
    .in("sellers.tax_account_id", taxAccountIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading entity transactions:", error);
    return [];
  }

  return data || [];
}

