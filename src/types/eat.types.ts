export type EATStatus = 'Active' | 'Inactive' | 'Dissolved';
export type EATAccessType = 'signer' | 'viewer' | 'manager';

export interface EATLLC {
  id: number;
  company_name: string;
  eat_number: string | null;
  state_formation: string;
  date_formation: string;
  licensed_in: string | null;
  ein: string | null;
  registered_agent: string | null;
  registered_agent_address: string | null;
  qi_company_id: string | null;
  status: EATStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EATLLCProfileAccess {
  id: number;
  eat_llc_id: number;
  user_profile_id: string; // UUID from user_profiles
  access_type: EATAccessType;
  granted_at: string;
  granted_by: string | null;
  user_profile?: {
    id: string;
    email: string;
    role_type: string;
  };
}

export interface USState {
  code: string;
  name: string;
  is_popular_for_llc: boolean;
}

export interface EATLLCWithAccess extends EATLLC {
  profile_accesses?: EATLLCProfileAccess[];
}

export interface CreateEATLLCData {
  company_name: string;
  state_formation: string;
  date_formation: string;
  licensed_in?: string;
  ein?: string;
  registered_agent?: string;
  registered_agent_address?: string;
  qi_company_id?: string;
  user_profile_ids?: string[]; // User Profile UUIDs (admins) to grant access
}

