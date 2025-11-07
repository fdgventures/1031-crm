// Document Template Types
export type TemplateType = 'transaction' | 'exchange' | 'property' | 'eat';

export interface DocumentTemplateComponent {
  id: number;
  name: string;
  component_type: 'header' | 'footer';
  content: Record<string, unknown>; // Rich text JSON
  qi_company_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  description?: string;
  template_type: TemplateType;
  content: { html?: string } | Record<string, unknown>; // Rich text JSON with dynamic fields
  header_component_id?: number;
  footer_component_id?: number;
  dynamic_fields: string[]; // e.g., ['<<tax seller>>', '<<property address>>']
  qi_company_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Relations
  header_component?: DocumentTemplateComponent;
  footer_component?: DocumentTemplateComponent;
}

export interface TemplateSignatureField {
  id: number;
  template_id: number;
  field_name: string;
  field_type: 'signature' | 'date' | 'text';
  position_x: number;
  position_y: number;
  page_number: number;
  width: number;
  height: number;
  signer_role?: string;
  is_required: boolean;
  signing_order: number;
  created_at: string;
  updated_at: string;
}

// Signature Types
export type SignatureType = 'property' | 'entity';

export interface VestingNameSignature {
  id: number;
  tax_account_id: number;
  vesting_name: string;
  signature_type: SignatureType;
  signature_text: string;
  signature_font: string;
  // Property type fields
  printed_name?: string;
  // Entity type fields
  entity_name?: string;
  by_name?: string;
  its_title?: string;
  signature_id: string;
  created_at: string;
  updated_at: string;
}

export interface AdminSignature {
  id: number;
  admin_user_id: string;
  signature_type: SignatureType;
  signature_text: string;
  signature_font: string;
  printed_name?: string;
  entity_name?: string;
  by_name?: string;
  its_title?: string;
  signature_id: string;
  qi_company_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Document Types
export type DocumentStatus = 
  | 'draft'
  | 'pending_signatures'
  | 'partially_signed'
  | 'fully_signed'
  | 'completed'
  | 'cancelled';

export interface Document {
  id: number;
  template_id: number;
  document_name: string;
  document_number: string;
  transaction_id?: number;
  exchange_id?: number;
  property_id?: number;
  eat_parked_file_id?: number;
  content: { html?: string } | Record<string, unknown>; // Rendered content with filled dynamic fields
  pdf_url?: string;
  status: DocumentStatus;
  qi_company_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  completed_at?: string;
  // Relations
  template?: DocumentTemplate;
  signature_requests?: DocumentSignatureRequest[];
}

export type SignatureRequestStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined'
  | 'expired';

export interface DocumentSignatureRequest {
  id: number;
  document_id: number;
  template_field_id: number;
  signer_user_id?: string;
  signer_email?: string;
  signer_name?: string;
  admin_signature_id?: number;
  vesting_signature_id?: number;
  status: SignatureRequestStatus;
  signing_order: number;
  signed_at?: string;
  signature_image_url?: string;
  ip_address?: string;
  user_agent?: string;
  sent_at?: string;
  viewed_at?: string;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  template_field?: TemplateSignatureField;
  admin_signature?: AdminSignature;
  vesting_signature?: VestingNameSignature;
}

// Dynamic field definitions for each object type
export interface DynamicFieldDefinition {
  placeholder: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
}

export const TRANSACTION_DYNAMIC_FIELDS: DynamicFieldDefinition[] = [
  { placeholder: '<<transaction number>>', label: 'Transaction Number', type: 'text' },
  { placeholder: '<<contract price>>', label: 'Contract Purchase Price', type: 'number' },
  { placeholder: '<<contract date>>', label: 'Contract Date', type: 'date' },
  { placeholder: '<<sale type>>', label: 'Sale Type', type: 'text' },
  { placeholder: '<<seller name>>', label: 'Seller Name', type: 'text' },
  { placeholder: '<<buyer name>>', label: 'Buyer Name', type: 'text' },
  { placeholder: '<<property address>>', label: 'Property Address', type: 'text' },
  { placeholder: '<<closing agent>>', label: 'Closing Agent', type: 'text' },
];

export const EXCHANGE_DYNAMIC_FIELDS: DynamicFieldDefinition[] = [
  { placeholder: '<<exchange number>>', label: 'Exchange Number', type: 'text' },
  { placeholder: '<<tax account name>>', label: 'Tax Account Name', type: 'text' },
  { placeholder: '<<day 45 date>>', label: 'Day 45 Date', type: 'date' },
  { placeholder: '<<day 180 date>>', label: 'Day 180 Date', type: 'date' },
  { placeholder: '<<total sale proceeds>>', label: 'Total Sale Proceeds', type: 'number' },
  { placeholder: '<<total purchase>>', label: 'Total Purchase', type: 'number' },
  { placeholder: '<<exchange status>>', label: 'Exchange Status', type: 'text' },
];

export const PROPERTY_DYNAMIC_FIELDS: DynamicFieldDefinition[] = [
  { placeholder: '<<property address>>', label: 'Property Address', type: 'text' },
  { placeholder: '<<property type>>', label: 'Property Type', type: 'text' },
  { placeholder: '<<property value>>', label: 'Property Value', type: 'number' },
  { placeholder: '<<legal description>>', label: 'Legal Description', type: 'textarea' },
];

export const EAT_DYNAMIC_FIELDS: DynamicFieldDefinition[] = [
  { placeholder: '<<eat number>>', label: 'EAT Number', type: 'text' },
  { placeholder: '<<eat name>>', label: 'EAT Name', type: 'text' },
  { placeholder: '<<total acquired value>>', label: 'Total Acquired Property Value', type: 'number' },
  { placeholder: '<<total parked value>>', label: 'Total Parked Property Value', type: 'number' },
  { placeholder: '<<day 45 date>>', label: 'Day 45 Date', type: 'date' },
  { placeholder: '<<day 180 date>>', label: 'Day 180 Date', type: 'date' },
  { placeholder: '<<eat state>>', label: 'EAT State', type: 'text' },
  { placeholder: '<<eat status>>', label: 'EAT Status', type: 'text' },
];

export function getDynamicFieldsForType(templateType: TemplateType): DynamicFieldDefinition[] {
  switch (templateType) {
    case 'transaction':
      return TRANSACTION_DYNAMIC_FIELDS;
    case 'exchange':
      return EXCHANGE_DYNAMIC_FIELDS;
    case 'property':
      return PROPERTY_DYNAMIC_FIELDS;
    case 'eat':
      return EAT_DYNAMIC_FIELDS;
    default:
      return [];
  }
}

// Available signature fonts
export const SIGNATURE_FONTS = [
  'Brush Script MT',
  'Lucida Handwriting',
  'Segoe Script',
  'Monotype Corsiva',
  'Freestyle Script',
  'Edwardian Script ITC',
];

