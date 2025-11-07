import { getSupabaseClient } from "@/lib/supabase";
import type {
  DocumentTemplate,
  DocumentTemplateComponent,
  TemplateSignatureField,
  VestingNameSignature,
  AdminSignature,
  Document,
  DocumentSignatureRequest,
  TemplateType,
  SignatureType,
} from "@/types/document.types";

// ==================== DOCUMENT TEMPLATE COMPONENTS ====================

export async function getTemplateComponents(qiCompanyId?: string) {
  const supabase = getSupabaseClient();
  const query = supabase
    .from("document_template_components")
    .select("*")
    .order("created_at", { ascending: false });

  if (qiCompanyId) {
    query.eq("qi_company_id", qiCompanyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DocumentTemplateComponent[];
}

export async function createTemplateComponent(
  component: Partial<DocumentTemplateComponent>
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("document_template_components")
    .insert(component)
    .select()
    .single();

  if (error) {
    console.error("Supabase error creating component:", error);
    throw new Error(
      `Failed to create component: ${error.message || JSON.stringify(error)}`
    );
  }
  return data as DocumentTemplateComponent;
}

export async function updateTemplateComponent(
  id: number,
  updates: Partial<DocumentTemplateComponent>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_template_components")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentTemplateComponent;
}

export async function deleteTemplateComponent(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("document_template_components")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ==================== DOCUMENT TEMPLATES ====================

export async function getDocumentTemplates(
  templateType?: TemplateType,
  qiCompanyId?: string
) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("document_templates")
    .select(
      `
      *,
      header_component:header_component_id(*),
      footer_component:footer_component_id(*)
    `
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (templateType) {
    query = query.eq("template_type", templateType);
  }

  if (qiCompanyId) {
    query = query.eq("qi_company_id", qiCompanyId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase error fetching templates:", error);
    throw new Error(
      `Failed to fetch templates: ${error.message || JSON.stringify(error)}`
    );
  }
  return data as DocumentTemplate[];
}

export async function getDocumentTemplateById(id: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select(
      `
      *,
      header_component:header_component_id(*),
      footer_component:footer_component_id(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as DocumentTemplate;
}

export async function createDocumentTemplate(
  template: Partial<DocumentTemplate>
) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("document_templates")
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    throw new Error(`Failed to create template: ${error.message || "Unknown error"}`);
  }
  
  return data as DocumentTemplate;
}

export async function updateDocumentTemplate(
  id: number,
  updates: Partial<DocumentTemplate>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentTemplate;
}

export async function deleteDocumentTemplate(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("document_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ==================== TEMPLATE SIGNATURE FIELDS ====================

export async function getTemplateSignatureFields(templateId: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("template_signature_fields")
    .select("*")
    .eq("template_id", templateId)
    .order("signing_order", { ascending: true });

  if (error) throw error;
  return data as TemplateSignatureField[];
}

export async function createTemplateSignatureField(
  field: Partial<TemplateSignatureField>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("template_signature_fields")
    .insert(field)
    .select()
    .single();

  if (error) throw error;
  return data as TemplateSignatureField;
}

export async function updateTemplateSignatureField(
  id: number,
  updates: Partial<TemplateSignatureField>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("template_signature_fields")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as TemplateSignatureField;
}

export async function deleteTemplateSignatureField(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("template_signature_fields")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ==================== VESTING NAME SIGNATURES ====================

export async function getVestingNameSignatures(taxAccountId: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vesting_name_signatures")
    .select("*")
    .eq("tax_account_id", taxAccountId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as VestingNameSignature[];
}

export async function getVestingNameSignatureByVestingName(
  taxAccountId: number,
  vestingName: string
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vesting_name_signatures")
    .select("*")
    .eq("tax_account_id", taxAccountId)
    .eq("vesting_name", vestingName)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as VestingNameSignature | null;
}

export async function createVestingNameSignature(
  signature: Partial<VestingNameSignature>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vesting_name_signatures")
    .insert(signature)
    .select()
    .single();

  if (error) throw error;
  return data as VestingNameSignature;
}

export async function updateVestingNameSignature(
  id: number,
  updates: Partial<VestingNameSignature>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vesting_name_signatures")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as VestingNameSignature;
}

export async function deleteVestingNameSignature(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("vesting_name_signatures")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ==================== ADMIN SIGNATURES ====================

export async function getAdminSignatures(qiCompanyId?: string) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("admin_signatures")
    .select("*")
    .order("created_at", { ascending: false });

  if (qiCompanyId) {
    query = query.eq("qi_company_id", qiCompanyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as AdminSignature[];
}

export async function getAdminSignatureByUserId(
  userId: string,
  qiCompanyId?: string
) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("admin_signatures")
    .select("*")
    .eq("admin_user_id", userId);

  if (qiCompanyId) {
    query = query.eq("qi_company_id", qiCompanyId);
  }

  const { data, error } = await query.single();
  if (error && error.code !== "PGRST116") throw error;
  return data as AdminSignature | null;
}

export async function createAdminSignature(signature: Partial<AdminSignature>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("admin_signatures")
    .insert(signature)
    .select()
    .single();

  if (error) throw error;
  return data as AdminSignature;
}

export async function updateAdminSignature(
  id: number,
  updates: Partial<AdminSignature>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("admin_signatures")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as AdminSignature;
}

export async function deleteAdminSignature(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("admin_signatures")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ==================== DOCUMENTS ====================

export async function getDocuments(filters?: {
  transactionId?: number;
  exchangeId?: number;
  propertyId?: number;
  eatParkedFileId?: number;
  qiCompanyId?: string;
}) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("documents")
    .select(
      `
      *,
      template:template_id(*),
      signature_requests:document_signature_requests(*)
    `
    )
    .order("created_at", { ascending: false });

  if (filters?.transactionId) {
    query = query.eq("transaction_id", filters.transactionId);
  }
  if (filters?.exchangeId) {
    query = query.eq("exchange_id", filters.exchangeId);
  }
  if (filters?.propertyId) {
    query = query.eq("property_id", filters.propertyId);
  }
  if (filters?.eatParkedFileId) {
    query = query.eq("eat_parked_file_id", filters.eatParkedFileId);
  }
  if (filters?.qiCompanyId) {
    query = query.eq("qi_company_id", filters.qiCompanyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Document[];
}

export async function getDocumentById(id: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      `
      *,
      template:template_id(*),
      signature_requests:document_signature_requests(
        *,
        template_field:template_field_id(*),
        admin_signature:admin_signature_id(*),
        vesting_signature:vesting_signature_id(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Document;
}

export async function createDocument(document: Partial<Document>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .insert(document)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

export async function updateDocument(id: number, updates: Partial<Document>) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

export async function deleteDocument(id: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) throw error;
}

// ==================== DOCUMENT SIGNATURE REQUESTS ====================

export async function getDocumentSignatureRequests(documentId: number) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_signature_requests")
    .select(
      `
      *,
      template_field:template_field_id(*),
      admin_signature:admin_signature_id(*),
      vesting_signature:vesting_signature_id(*)
    `
    )
    .eq("document_id", documentId)
    .order("signing_order", { ascending: true });

  if (error) throw error;
  return data as DocumentSignatureRequest[];
}

export async function createDocumentSignatureRequest(
  request: Partial<DocumentSignatureRequest>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_signature_requests")
    .insert(request)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentSignatureRequest;
}

export async function updateDocumentSignatureRequest(
  id: number,
  updates: Partial<DocumentSignatureRequest>
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_signature_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentSignatureRequest;
}

export async function signDocumentSignatureRequest(
  id: number,
  signatureImageUrl: string,
  ipAddress?: string,
  userAgent?: string
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("document_signature_requests")
    .update({
      status: "signed",
      signed_at: new Date().toISOString(),
      signature_image_url: signatureImageUrl,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentSignatureRequest;
}
