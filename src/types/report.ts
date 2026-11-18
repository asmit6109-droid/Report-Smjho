import { SupportedLanguage } from '../utils/translations';

export type SeverityLevel = 'green' | 'yellow' | 'red';

export type BodyRegionId =
  | 'head'
  | 'eyes_ears'
  | 'thyroid'
  | 'neck_cervical'
  | 'chest_lungs'
  | 'heart'
  | 'abdomen_liver'
  | 'stomach_intestines'
  | 'kidney'
  | 'urinary_system'
  | 'spine_thoracic'
  | 'spine_lumbar'
  | 'shoulder_left'
  | 'shoulder_right'
  | 'arms_hands'
  | 'pelvis'
  | 'knee_left'
  | 'knee_right'
  | 'feet'
  | 'bones_joints'
  | 'blood_system'
  | 'general';

export interface TranslatedTextBlock {
  report_type?: string;
  severity_reason?: string;
  symptoms_to_watch?: string[];
  safe_steps?: string[];
  doctor_questions?: string[];
}

export interface Finding {
  id: string;
  name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  range_source: 'lab' | 'general';
  status: 'normal' | 'low' | 'high' | 'critical';
  body_region: BodyRegionId;
  short_explanation: string;
  // Optional metadata for combined scans & deterministic table mapping
  source_report_id?: string;
  source_label?: string;
  source_date?: string;
  mapping_kind?: 'related_lab' | 'affected_injury';
  translations?: Partial<
    Record<
      SupportedLanguage,
      {
        name?: string;
        short_explanation?: string;
      }
    >
  >;
}

export interface ReportAnalysis {
  id: string;
  created_at: string;
  report_date?: string;
  report_type: string;
  patient_name?: string;
  patient_age?: number | null;
  patient_gender?: 'male' | 'female' | 'other' | null;
  overall_severity: SeverityLevel;
  severity_reason: string;
  urgency: 'routine' | 'soon' | 'today';
  body_regions_affected: BodyRegionId[];
  findings: Finding[];
  symptoms_to_watch: string[];
  safe_steps: string[];
  doctor_questions: string[];
  image_quality: 'good' | 'ok' | 'poor';
  quality_notes?: string;
  is_raw_scan_without_text?: boolean;
  isDemo?: boolean;
  pages_count?: number;
  language?: SupportedLanguage;
  translations?: Partial<Record<SupportedLanguage, TranslatedTextBlock>>;
}

export interface ReportGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  reportIds: string[];
  isDemo?: boolean;
}

export interface CombinedReportScan {
  report: ReportAnalysis;
  label: string;
  dateLabel: string;
}

export interface CombinedReportData {
  merged: ReportAnalysis;
  scans: CombinedReportScan[];
  mismatchWarning: boolean;
  mismatchReasons: string[];
  groupId?: string;
  groupName?: string;
  isDemo?: boolean;
}

export interface UserProfile {
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  language: SupportedLanguage;
  disclaimerAccepted: boolean;
}

export interface MarkerTrend {
  markerName: string;
  unit: string;
  history: {
    date: string;
    value: number;
    unit: string;
    reportId: string;
  }[];
  direction: 'better' | 'same' | 'worse';
  changeSummary: string;
}
