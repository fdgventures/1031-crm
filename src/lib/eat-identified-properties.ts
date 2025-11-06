import { getSupabaseClient } from "./supabase";

export interface EATIdentifiedProperty {
  id: number;
  eat_parked_file_id: number;
  property_id: number | null;
  identification_type: "written_form" | "by_contract";
  property_type: "standard_address" | "dst" | "membership_interest";
  description: string | null;
  status: string;
  percentage: number | null;
  value: number | null;
  identification_date: string;
  is_parked: boolean;
  document_storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  property?: {
    id: number;
    address: string;
  };
  improvements?: Array<{
    id: number;
    eat_identified_property_id: number;
    description: string;
    value: number;
    created_at: string;
    updated_at: string;
  }>;
}

export interface CreateEATIdentifiedPropertyInput {
  eat_parked_file_id: number;
  property_id?: number;
  identification_type: "written_form" | "by_contract";
  property_type: "standard_address" | "dst" | "membership_interest";
  description?: string;
  status?: string;
  percentage?: number;
  value?: number;
  identification_date?: string;
  is_parked?: boolean;
  document_storage_path?: string;
}

/**
 * Get all identified properties for an EAT Parked File
 */
export async function getEATIdentifiedProperties(
  eatParkedFileId: number
): Promise<EATIdentifiedProperty[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_identified_properties")
    .select(
      `
      *,
      property:property_id (
        id,
        address
      ),
      improvements:eat_property_improvements (
        id,
        eat_identified_property_id,
        description,
        value,
        created_at,
        updated_at
      )
    `
    )
    .eq("eat_parked_file_id", eatParkedFileId)
    .order("identification_date", { ascending: false });

  if (error) {
    console.error("Error loading EAT identified properties:", error);
    return [];
  }

  return (data || []) as EATIdentifiedProperty[];
}

/**
 * Create identified property
 */
export async function createEATIdentifiedProperty(
  input: CreateEATIdentifiedPropertyInput
): Promise<{ success: boolean; id?: number; error?: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_identified_properties")
    .insert(input)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating EAT identified property:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true, id: data.id };
}

/**
 * Update identified property
 */
export async function updateEATIdentifiedProperty(
  id: number,
  updates: Partial<EATIdentifiedProperty>
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_identified_properties")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating EAT identified property:", error);
    return false;
  }

  return true;
}

/**
 * Delete identified property
 */
export async function deleteEATIdentifiedProperty(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_identified_properties")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting EAT identified property:", error);
    return false;
  }

  return true;
}

/**
 * Add improvement to identified property
 */
export async function addEATPropertyImprovement(
  identifiedPropertyId: number,
  description: string,
  value: number
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("eat_property_improvements").insert({
    eat_identified_property_id: identifiedPropertyId,
    description,
    value,
  });

  if (error) {
    console.error("Error adding EAT property improvement:", error);
    return false;
  }

  return true;
}

/**
 * Update improvement
 */
export async function updateEATPropertyImprovement(
  improvementId: number,
  updates: { description?: string; value?: number }
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_property_improvements")
    .update(updates)
    .eq("id", improvementId);

  if (error) {
    console.error("Error updating EAT property improvement:", error);
    return false;
  }

  return true;
}

/**
 * Delete improvement
 */
export async function deleteEATPropertyImprovement(
  improvementId: number
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_property_improvements")
    .delete()
    .eq("id", improvementId);

  if (error) {
    console.error("Error deleting EAT property improvement:", error);
    return false;
  }

  return true;
}

