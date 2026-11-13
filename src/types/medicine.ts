export type MedicineAccessLevel = 'otc' | 'ask_doctor' | 'prescription_only';
export type MedicineSourceTag = 'doctor_prescribed' | 'bought_myself' | 'not_sure';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type FieldSourceType = 'printed_on_pack' | 'verified_database' | 'not_verified';

export interface MedicinePackInfo {
  brand: string;
  salt: string | null;
  strength: string | null;
  manufacturer: string | null;
  batch: string | null;
  expiry: string | null;
  expiry_reliable?: boolean;
  mrp: string | null;
  printed_warnings?: string[];
  access_level: MedicineAccessLevel;
  is_expired: boolean;
}

export interface MedicineStep1Result {
  medicine: MedicinePackInfo;
  confidence: ConfidenceLevel;
  unreadable_fields: string[];
  is_loose_tablet_only: boolean;
  image_quality: 'ok' | 'poor';
  quality_notes?: string;
  risk_flags: string[];
  suspicious_flags: string[];
}

export interface VerifiedDrugFacts {
  verified: boolean;
  database_name: string; // e.g. 'openFDA + RxNorm'
  normalized_salt: string;
  uses: string | null;
  warnings: string | null;
  side_effects: string | null;
  interactions: string | null;
  precautions: string | null;
  dosage_administration: string | null;
  storage: string | null;
  pregnancy_lactation: string | null;
  pediatric_geriatric: string | null;
  raw_summary?: string;
}

export interface MedicineFieldSources {
  what_is_it?: FieldSourceType;
  why_used?: FieldSourceType;
  how_it_works?: FieldSourceType;
  how_to_take?: FieldSourceType;
  side_effects?: FieldSourceType;
  time_to_feel_better?: FieldSourceType;
  be_careful_if?: FieldSourceType;
  interactions?: FieldSourceType;
  storage?: FieldSourceType;
  dos_donts?: FieldSourceType;
}

export interface MedicineTranslationFields {
  brand?: string;
  salt?: string;
  what_is_it?: string;
  purpose?: string;
  how_it_works?: string;
  how_to_take_as_printed?: string;
  side_effects_common?: string[];
  side_effects_see_doctor?: string[];
  time_to_feel_better?: string;
  be_careful_if?: string[];
  interactions?: string[];
  storage_instructions?: string;
  dos_donts?: string[];
  allergy_condition_warning?: string;
}

export interface MedicineReportConnection {
  connection_found: boolean;
  conflict_detected?: boolean;
  why_given: string;
  what_to_do_now: string[];
  ask_doctor: string[];
}

export interface MedicineAnalysis {
  id: string;
  created_at: string;
  is_demo?: boolean;
  pack_thumbnail?: string;
  medicine: MedicinePackInfo;
  what_is_it?: string;
  purpose: string;
  how_it_works: string;
  how_to_take_as_printed: string;
  side_effects_common: string[];
  side_effects_see_doctor: string[];
  time_to_feel_better: string;
  be_careful_if: string[];
  interactions?: string[];
  storage_instructions?: string;
  dos_donts: string[];
  risk_flags: string[];
  suspicious_flags: string[];
  allergy_condition_warning?: string;
  confidence: ConfidenceLevel;
  unreadable_fields: string[];
  is_loose_tablet_only?: boolean;
  image_quality: 'ok' | 'poor';
  quality_notes?: string;
  // Step 2 + Step 3 verification metadata
  verification_status?: 'verified' | 'not_verified';
  verification_database?: string;
  verified_facts?: VerifiedDrugFacts;
  field_sources?: MedicineFieldSources;
  // User metadata & links stored on device
  user_problem?: string;
  source_tag?: MedicineSourceTag;
  doctor_name?: string;
  start_date?: string;
  duration_days?: string;
  linked_report_id?: string;
  linked_prescription_id?: string;
  connection_summary?: MedicineReportConnection;
  translations?: {
    en?: MedicineTranslationFields;
    hi?: MedicineTranslationFields;
    or?: MedicineTranslationFields;
  };
}

export interface PrescriptionLineItem {
  id: string;
  name: string;
  instructions: string;
  duration: string;
  confidence: ConfidenceLevel;
  needs_check: boolean;
}

export interface PrescriptionRecord {
  id: string;
  created_at: string;
  doctor_name?: string;
  date?: string;
  prescription_thumbnail?: string;
  lines: PrescriptionLineItem[];
  medicines: MedicineAnalysis[];
  why_this_prescription?: MedicineReportConnection;
  linked_report_id?: string;
  user_problem?: string;
  image_quality: 'ok' | 'poor';
  quality_notes?: string;
}

export interface UserHealthProfile {
  allergies: string[];
  conditions: string[];
  is_pregnant_or_breastfeeding?: boolean;
}

export interface SameSaltPair {
  medA: MedicineAnalysis;
  medB: MedicineAnalysis;
  sharedSalt: string;
}
