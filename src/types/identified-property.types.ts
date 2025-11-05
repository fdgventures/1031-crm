export type IdentificationType = 'written_form' | 'by_contract';
export type PropertyType = 'standard_address' | 'dst' | 'membership_interest';
export type IdentificationStatus = 'identified' | 'under_contract' | 'acquired' | 'cancelled';

export interface PropertyImprovement {
  id: number;
  identified_property_id: number;
  description: string;
  value: number;
  created_at: string;
  updated_at: string;
}

export interface IdentifiedProperty {
  id: number;
  exchange_id: number;
  property_id?: number | null;
  identification_type: IdentificationType;
  property_type: PropertyType;
  description: string | null;
  status: IdentificationStatus;
  percentage?: number | null;
  value?: number | null;
  identification_date: string;
  is_parked: boolean;
  document_storage_path?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  
  // Relations
  property?: {
    id: number;
    address: string;
  };
  improvements?: PropertyImprovement[];
}

export interface IdentifiedPropertyInsert {
  exchange_id: number;
  property_id?: number | null;
  identification_type: IdentificationType;
  property_type: PropertyType;
  description?: string | null;
  status?: IdentificationStatus;
  percentage?: number | null;
  value?: number | null;
  identification_date?: string;
  is_parked?: boolean;
  document_storage_path?: string | null;
  metadata?: Record<string, any>;
}

export interface PropertyImprovementInsert {
  identified_property_id: number;
  description: string;
  value: number;
}

// 1031 Exchange Rules
export type ExchangeRule = '3_property' | '200_percent' | '95_percent' | 'compliant' | 'none';

export interface ExchangeRuleStatus {
  activeRule: ExchangeRule;
  isCompliant: boolean;
  totalIdentifiedValue: number;
  totalSaleValue: number;
  identifiedCount: number;
  violations: string[];
  warnings: string[];
}

