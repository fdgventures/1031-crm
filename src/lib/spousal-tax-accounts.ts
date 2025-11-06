import { getSupabaseClient } from "@/lib/supabase";

export interface SpousalTaxAccountData {
  // Primary profile
  primaryProfileId: number;
  primaryTaxAccountName: string;
  primaryBusinessName: string;
  
  // Spouse profile
  spouseProfileId: number;
  spouseTaxAccountName: string;
  spouseBusinessName: string;
}

/**
 * Создает spousal tax account (совместный налоговый аккаунт супругов)
 * Создается ОДИН tax account, который будет отображаться у обоих профилей
 */
export async function createSpousalTaxAccount(
  data: SpousalTaxAccountData
): Promise<{ success: boolean; taxAccountId?: number; error?: string }> {
  const supabase = getSupabaseClient();

  try {
    // 1. Получаем данные профилей для генерации account_number
    const [primaryProfile, spouseProfile] = await Promise.all([
      supabase
        .from("profile")
        .select("last_name, first_name")
        .eq("id", data.primaryProfileId)
        .single(),
      supabase
        .from("profile")
        .select("last_name, first_name")
        .eq("id", data.spouseProfileId)
        .single()
    ]);

    if (primaryProfile.error) throw primaryProfile.error;
    if (spouseProfile.error) throw spouseProfile.error;

    // 2. Создаем spousal tax account
    const { data: taxAccount, error: taxAccountError } = await supabase
      .from("tax_accounts")
      .insert({
        name: `${data.primaryTaxAccountName} & ${data.spouseTaxAccountName}`,
        profile_id: data.primaryProfileId, // Primary owner
        primary_profile_id: data.primaryProfileId,
        spouse_profile_id: data.spouseProfileId,
        is_spousal: true,
      })
      .select()
      .single();

    if (taxAccountError) throw taxAccountError;

    // 3. Генерируем account_number
    const { count, error: countError } = await supabase
      .from("tax_accounts")
      .select("*", { count: "exact", head: true })
      .eq("is_spousal", true);

    if (countError) throw countError;

    const sequenceNumber = ((count ?? 0)).toString().padStart(3, "0");
    const primaryLastName = (primaryProfile.data?.last_name || "XXX")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    const spouseLastName = (spouseProfile.data?.last_name || "XXX")
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, "X");
    
    // Format: INV-[Primary]-[Spouse]-[Seq]
    const accountNumber = `INV-${primaryLastName}${spouseLastName}${sequenceNumber}`;

    // 4. Обновляем account_number
    const { error: updateError } = await supabase
      .from("tax_accounts")
      .update({ account_number: accountNumber })
      .eq("id", taxAccount.id);

    if (updateError) throw updateError;

    // 5. Создаем business names для обоих супругов
    const businessNamesToCreate = [];

    // Primary business name
    if (data.primaryBusinessName.trim()) {
      businessNamesToCreate.push({
        name: data.primaryBusinessName.trim(),
        tax_account_id: taxAccount.id,
      });
    }

    // Spouse business name
    if (data.spouseBusinessName.trim()) {
      businessNamesToCreate.push({
        name: data.spouseBusinessName.trim(),
        tax_account_id: taxAccount.id,
      });
    }

    // Joint business name (default)
    if (businessNamesToCreate.length === 0) {
      businessNamesToCreate.push({
        name: `${data.primaryTaxAccountName} & ${data.spouseTaxAccountName}`,
        tax_account_id: taxAccount.id,
      });
    }

    if (businessNamesToCreate.length > 0) {
      const { error: businessNameError } = await supabase
        .from("business_names")
        .insert(businessNamesToCreate);

      if (businessNameError) throw businessNameError;
    }

    // 6. Создаем fee schedule из templates
    const { data: feeTemplates, error: feeTemplatesError } = await supabase
      .from("fee_templates")
      .select("*")
      .eq("is_active", true);

    if (!feeTemplatesError && feeTemplates && feeTemplates.length > 0) {
      const feeSchedules = feeTemplates.map(template => ({
        tax_account_id: taxAccount.id,
        name: template.name,
        amount: template.amount,
        description: template.description,
      }));

      await supabase.from("fee_schedules").insert(feeSchedules);
    }

    return {
      success: true,
      taxAccountId: taxAccount.id,
    };
  } catch (error) {
    console.error("Error creating spousal tax account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create spousal tax account",
    };
  }
}

/**
 * Получает все tax accounts для профиля, включая spousal accounts
 */
export async function getProfileTaxAccounts(profileId: number) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("tax_accounts")
    .select(`
      *,
      spouse_profile:spouse_profile_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .or(`profile_id.eq.${profileId},spouse_profile_id.eq.${profileId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching profile tax accounts:", error);
    return [];
  }

  return data || [];
}

