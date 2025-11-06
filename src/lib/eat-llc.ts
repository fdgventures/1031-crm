import { getSupabaseClient } from "@/lib/supabase";
import type { EATLLC, EATLLCWithAccess, CreateEATLLCData, USState } from "@/types/eat.types";

/**
 * Получает список всех штатов США для dropdowns
 */
export async function getUSStates(): Promise<USState[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("us_states")
    .select("*")
    .order("name");

  if (error) {
    console.error("Failed to fetch US states:", error);
    return [];
  }

  return data || [];
}

/**
 * Получает популярные штаты для LLC формирования
 */
export async function getPopularLLCStates(): Promise<USState[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("us_states")
    .select("*")
    .eq("is_popular_for_llc", true)
    .order("name");

  if (error) {
    console.error("Failed to fetch popular LLC states:", error);
    return [];
  }

  return data || [];
}

/**
 * Создает новый EAT LLC
 */
export async function createEATLLC(
  eatData: CreateEATLLCData
): Promise<{ success: boolean; eatLlcId?: number; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // 1. Генерируем EAT number
    const { data: eatNumber, error: numberError } = await supabase
      .rpc("generate_eat_number", { state_code: eatData.state_formation });

    if (numberError) throw numberError;

    // 2. Создаем EAT LLC
    const { data: eatLlc, error: eatError } = await supabase
      .from("eat_llcs")
      .insert({
        company_name: eatData.company_name,
        eat_number: eatNumber,
        state_formation: eatData.state_formation,
        date_formation: eatData.date_formation,
        licensed_in: eatData.licensed_in || null,
        ein: eatData.ein || null,
        registered_agent: eatData.registered_agent || null,
        registered_agent_address: eatData.registered_agent_address || null,
        qi_company_id: eatData.qi_company_id || null,
        status: 'Active',
      })
      .select()
      .single();

    if (eatError) throw eatError;

    // 3. Добавляем user profile access если указаны
    if (eatData.user_profile_ids && eatData.user_profile_ids.length > 0) {
      const accessRecords = eatData.user_profile_ids.map(userProfileId => ({
        eat_llc_id: eatLlc.id,
        user_profile_id: userProfileId,
        access_type: 'signer' as const,
      }));

      const { error: accessError } = await supabase
        .from("eat_llc_profile_access")
        .insert(accessRecords);

      if (accessError) {
        console.error("Failed to add user profile access:", accessError);
        // Don't fail the whole operation, just log
      }
    }

    return {
      success: true,
      eatLlcId: eatLlc.id,
    };
  } catch (error) {
    console.error("Error creating EAT LLC:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create EAT LLC",
    };
  }
}

/**
 * Получает все EAT LLCs
 */
export async function getAllEATLLCs(): Promise<EATLLCWithAccess[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_llcs")
    .select(`
      *,
      profile_accesses:eat_llc_profile_access(
        id,
        user_profile_id,
        access_type,
        granted_at,
        user_profile:user_profile_id(
          id,
          email,
          role_type
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch EAT LLCs:", error);
    return [];
  }

  return (data || []) as EATLLCWithAccess[];
}

/**
 * Получает конкретный EAT LLC с профилями доступа
 */
export async function getEATLLC(id: number): Promise<EATLLCWithAccess | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_llcs")
    .select(`
      *,
      profile_accesses:eat_llc_profile_access(
        id,
        user_profile_id,
        access_type,
        granted_at,
        user_profile:user_profile_id(
          id,
          email,
          role_type
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch EAT LLC:", error);
    return null;
  }

  return data as EATLLCWithAccess;
}

/**
 * Обновляет EAT LLC
 */
export async function updateEATLLC(
  id: number,
  updates: Partial<EATLLC>
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_llcs")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Failed to update EAT LLC:", error);
    return false;
  }

  return true;
}

/**
 * Добавляет user profile access к EAT LLC
 */
export async function addProfileAccess(
  eatLlcId: number,
  userProfileId: string, // UUID from user_profiles
  accessType: 'signer' | 'viewer' | 'manager' = 'signer'
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_llc_profile_access")
    .insert({
      eat_llc_id: eatLlcId,
      user_profile_id: userProfileId,
      access_type: accessType,
    });

  if (error) {
    console.error("Failed to add user profile access:", error);
    return false;
  }

  return true;
}

/**
 * Удаляет user profile access
 */
export async function removeProfileAccess(
  eatLlcId: number,
  userProfileId: string // UUID from user_profiles
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("eat_llc_profile_access")
    .delete()
    .eq("eat_llc_id", eatLlcId)
    .eq("user_profile_id", userProfileId);

  if (error) {
    console.error("Failed to remove user profile access:", error);
    return false;
  }

  return true;
}

/**
 * Получает EAT LLCs где user profile имеет доступ
 */
export async function getEATLLCsForUserProfile(userProfileId: string): Promise<EATLLCWithAccess[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("eat_llc_profile_access")
    .select(`
      access_type,
      eat_llc:eat_llc_id(
        *,
        profile_accesses:eat_llc_profile_access(
          id,
          user_profile_id,
          access_type,
          user_profile:user_profile_id(
            id,
            email,
            role_type
          )
        )
      )
    `)
    .eq("user_profile_id", userProfileId);

  if (error) {
    console.error("Failed to fetch EAT LLCs for user profile:", error);
    return [];
  }

  return (data || [])
    .map((item: { access_type: string; eat_llc: EATLLCWithAccess | EATLLCWithAccess[] }) => {
      // Handle if eat_llc is an array (from JOIN)
      if (Array.isArray(item.eat_llc)) {
        return item.eat_llc[0];
      }
      return item.eat_llc;
    })
    .filter((llc): llc is EATLLCWithAccess => Boolean(llc));
}

