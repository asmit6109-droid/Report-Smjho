export type SeverityLevel = 'green' | 'yellow' | 'red';
export type UrgencyLevel = 'routine' | 'soon' | 'today';
export type RangeSource = 'lab' | 'general';
export type FindingStatus = 'low' | 'normal' | 'high' | 'critical';

export type BodyRegionId =
  | 'head'
  | 'neck_cervical'
  | 'chest_lungs'
  | 'heart'
  | 'abdomen_liver'
  | 'kidney'
  | 'spine_lumbar'
  | 'pelvis'
  | 'shoulder_left'
  | 'shoulder_right'
  | 'knee_left'
  | 'knee_right'
  | 'blood_system'
  | 'general';

export interface Finding {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  reference_range?: string;
  range_source: RangeSource;
  status: FindingStatus;
  body_region: BodyRegionId;
  short_explanation: string;
  translations?: {
    en?: {
      name?: string;
      short_explanation?: string;
    };
    hi?: {
      name?: string;
      short_explanation?: string;
    };
    or?: {
      name?: string;
      short_explanation?: string;
    };
  };
}

export interface ReportAnalysis {
  id: string;
  created_at: string;
  report_type: string;
  patient_age?: number;
  patient_gender?: 'male' | 'female' | 'other';
  overall_severity: SeverityLevel;
  severity_reason: string;
  urgency: UrgencyLevel;
  body_regions_affected: BodyRegionId[];
  findings: Finding[];
  symptoms_to_watch: string[];
  safe_steps: string[];
  doctor_questions: string[];
  image_quality: 'ok' | 'poor';
  quality_notes?: string;
  is_raw_scan_without_text?: boolean;
  translations?: {
    en?: {
      report_type?: string;
      severity_reason?: string;
      symptoms_to_watch?: string[];
      safe_steps?: string[];
      doctor_questions?: string[];
    };
    hi?: {
      report_type?: string;
      severity_reason?: string;
      symptoms_to_watch?: string[];
      safe_steps?: string[];
      doctor_questions?: string[];
    };
    or?: {
      report_type?: string;
      severity_reason?: string;
      symptoms_to_watch?: string[];
      safe_steps?: string[];
      doctor_questions?: string[];
    };
  };
}

export interface UserProfile {
  disclaimerAccepted: boolean;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  language: 'en' | 'hi' | 'or';
}

export interface TrendDataPoint {
  date: string;
  value: number;
  unit: string;
  reportId: string;
}

export interface MarkerTrend {
  markerName: string;
  unit: string;
  history: TrendDataPoint[];
  direction: 'better' | 'same' | 'worse';
  changeSummary: string;
}
