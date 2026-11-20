import { Finding } from '../types/report';
import { SupportedLanguage } from './translations';

export interface ParsedNumericRange {
  low: number | null;
  high: number | null;
  mode: 'range' | 'upper_only' | 'lower_only';
  displayRange: string;
  source: 'lab' | 'aiims';
}

interface AiimsFallbackEntry {
  keywords: string[];
  low: number | null;
  high: number | null;
  mode: 'range' | 'upper_only' | 'lower_only';
  unit: string;
  display: string;
}

// Standard Indian adult reference ranges (AIIMS Delhi / ICMR guidance) used ONLY when lab range is missing
const AIIMS_REFERENCE_RANGES: AiimsFallbackEntry[] = [
  { keywords: ['tsh', 'thyroid stimulating'], low: 0.4, high: 4.5, mode: 'range', unit: 'mIU/L', display: '0.4 to 4.5 mIU/L' },
  { keywords: ['free t3', 'ft3'], low: 2.3, high: 4.2, mode: 'range', unit: 'pg/mL', display: '2.3 to 4.2 pg/mL' },
  { keywords: ['total t3', 't3', 'triiodothyronine'], low: 80, high: 200, mode: 'range', unit: 'ng/dL', display: '80 to 200 ng/dL' },
  { keywords: ['free t4', 'ft4'], low: 0.8, high: 1.8, mode: 'range', unit: 'ng/dL', display: '0.8 to 1.8 ng/dL' },
  { keywords: ['total t4', 't4', 'thyroxine'], low: 5.0, high: 12.0, mode: 'range', unit: 'ug/dL', display: '5.0 to 12.0 ug/dL' },
  { keywords: ['hba1c', 'glycated hemoglobin', 'a1c'], low: 4.0, high: 5.6, mode: 'range', unit: '%', display: '4.0 to 5.6%' },
  { keywords: ['fasting blood sugar', 'fasting glucose', 'fbs'], low: 70, high: 100, mode: 'range', unit: 'mg/dL', display: '70 to 100 mg/dL' },
  { keywords: ['post prandial', 'ppbs', 'pp blood sugar', 'post meal'], low: 70, high: 140, mode: 'range', unit: 'mg/dL', display: '70 to 140 mg/dL' },
  { keywords: ['blood glucose', 'blood sugar', 'random blood sugar', 'rbs', 'glucose'], low: 70, high: 140, mode: 'range', unit: 'mg/dL', display: '70 to 140 mg/dL' },
  { keywords: ['hemoglobin', 'haemoglobin', 'hb'], low: 12.0, high: 16.5, mode: 'range', unit: 'g/dL', display: '12.0 to 16.5 g/dL' },
  { keywords: ['rbc', 'red blood cell'], low: 4.0, high: 5.5, mode: 'range', unit: 'million/uL', display: '4.0 to 5.5 million/uL' },
  { keywords: ['wbc', 'total leukocyte', 'tlc', 'white blood cell'], low: 4000, high: 11000, mode: 'range', unit: '/uL', display: '4000 to 11000 /uL' },
  { keywords: ['platelet', 'plt'], low: 150000, high: 450000, mode: 'range', unit: '/uL', display: '150000 to 450000 /uL' },
  { keywords: ['esr', 'erythrocyte sedimentation'], low: 0, high: 20, mode: 'upper_only', unit: 'mm/hr', display: '0 to 20 mm/hr' },
  { keywords: ['mcv', 'mean corpuscular volume'], low: 80, high: 100, mode: 'range', unit: 'fL', display: '80 to 100 fL' },
  { keywords: ['hematocrit', 'pcv', 'packed cell'], low: 36, high: 48, mode: 'range', unit: '%', display: '36 to 48%' },
  { keywords: ['creatinine'], low: 0.6, high: 1.2, mode: 'range', unit: 'mg/dL', display: '0.6 to 1.2 mg/dL' },
  { keywords: ['blood urea', 'urea'], low: 15, high: 40, mode: 'range', unit: 'mg/dL', display: '15 to 40 mg/dL' },
  { keywords: ['bun'], low: 7, high: 20, mode: 'range', unit: 'mg/dL', display: '7 to 20 mg/dL' },
  { keywords: ['egfr'], low: 90, high: null, mode: 'lower_only', unit: 'mL/min', display: '90 or above' },
  { keywords: ['uric acid'], low: 3.5, high: 7.2, mode: 'range', unit: 'mg/dL', display: '3.5 to 7.2 mg/dL' },
  { keywords: ['sodium', 'na+'], low: 135, high: 145, mode: 'range', unit: 'mEq/L', display: '135 to 145 mEq/L' },
  { keywords: ['potassium', 'k+'], low: 3.5, high: 5.1, mode: 'range', unit: 'mEq/L', display: '3.5 to 5.1 mEq/L' },
  { keywords: ['sgpt', 'alt', 'alanine'], low: 7, high: 45, mode: 'range', unit: 'U/L', display: '7 to 45 U/L' },
  { keywords: ['sgot', 'ast', 'aspartate'], low: 8, high: 40, mode: 'range', unit: 'U/L', display: '8 to 40 U/L' },
  { keywords: ['total bilirubin', 'bilirubin'], low: 0.2, high: 1.2, mode: 'range', unit: 'mg/dL', display: '0.2 to 1.2 mg/dL' },
  { keywords: ['alkaline phosphatase', 'alp'], low: 40, high: 130, mode: 'range', unit: 'U/L', display: '40 to 130 U/L' },
  { keywords: ['albumin'], low: 3.5, high: 5.2, mode: 'range', unit: 'g/dL', display: '3.5 to 5.2 g/dL' },
  { keywords: ['total cholesterol', 'cholesterol'], low: null, high: 200, mode: 'upper_only', unit: 'mg/dL', display: 'below 200 mg/dL' },
  { keywords: ['ldl'], low: null, high: 100, mode: 'upper_only', unit: 'mg/dL', display: 'below 100 mg/dL' },
  { keywords: ['hdl'], low: 40, high: null, mode: 'lower_only', unit: 'mg/dL', display: '40 or above mg/dL' },
  { keywords: ['triglyceride'], low: null, high: 150, mode: 'upper_only', unit: 'mg/dL', display: 'below 150 mg/dL' },
  { keywords: ['vitamin d', '25-oh', 'vit d'], low: 30, high: 100, mode: 'range', unit: 'ng/mL', display: '30 to 100 ng/mL' },
  { keywords: ['vitamin b12', 'b12', 'cobalamin'], low: 200, high: 900, mode: 'range', unit: 'pg/mL', display: '200 to 900 pg/mL' },
  { keywords: ['calcium'], low: 8.5, high: 10.5, mode: 'range', unit: 'mg/dL', display: '8.5 to 10.5 mg/dL' },
  { keywords: ['ferritin'], low: 20, high: 250, mode: 'range', unit: 'ng/mL', display: '20 to 250 ng/mL' },
  { keywords: ['serum iron', 'iron'], low: 60, high: 170, mode: 'range', unit: 'ug/dL', display: '60 to 170 ug/dL' },
  { keywords: ['crp', 'c-reactive'], low: null, high: 5.0, mode: 'upper_only', unit: 'mg/L', display: 'below 5.0 mg/L' },
];

export function parseNumericValue(rawValue: string | number | null | undefined): number | null {
  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : null;
  }
  const str = String(rawValue || '').trim();
  if (!str) return null;
  // Remove commas (handles Indian and Western grouping like 1,50,000 or 150,000)
  const cleaned = str.replace(/,/g, '');
  const match = cleaned.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return Number.isFinite(num) ? num : null;
}

export function parseReferenceRangeString(
  rawRange: string | undefined | null,
  unit?: string
): ParsedNumericRange | null {
  const str = String(rawRange || '').trim();
  if (!str) return null;

  const normalized = str.replace(/,/g, '').replace(/[–—]/g, '-');

  // Check two-sided range: "12.0 - 16.0" or "12 to 16"
  const twoSided = normalized.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i);
  if (twoSided) {
    const low = parseFloat(twoSided[1]);
    const high = parseFloat(twoSided[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && high > low) {
      return {
        low,
        high,
        mode: 'range',
        displayRange: `${twoSided[1]} to ${twoSided[2]}${unit ? ` ${unit}` : ''}`,
        source: 'lab',
      };
    }
  }

  // Check upper-bound-only: "< 200", "<= 150", "up to 200", "below 200"
  const upperOnly = normalized.match(/(?:<=|<|up\s*to|below|less\s*than)\s*(\d+(?:\.\d+)?)/i);
  if (upperOnly) {
    const high = parseFloat(upperOnly[1]);
    if (Number.isFinite(high)) {
      return {
        low: null,
        high,
        mode: 'upper_only',
        displayRange: `below ${upperOnly[1]}${unit ? ` ${unit}` : ''}`,
        source: 'lab',
      };
    }
  }

  // Check lower-bound-only: "> 40", ">= 90", "above 40"
  const lowerOnly = normalized.match(/(?:>=|>|above|more\s*than)\s*(\d+(?:\.\d+)?)/i);
  if (lowerOnly) {
    const low = parseFloat(lowerOnly[1]);
    if (Number.isFinite(low)) {
      return {
        low,
        high: null,
        mode: 'lower_only',
        displayRange: `${lowerOnly[1]} or above${unit ? ` ${unit}` : ''}`,
        source: 'lab',
      };
    }
  }

  return null;
}

export function resolveFindingRange(finding: Finding): ParsedNumericRange | null {
  const fromLab = parseReferenceRangeString(finding.reference_range, finding.unit);
  if (fromLab) {
    return {
      ...fromLab,
      source: finding.range_source === 'general' ? 'aiims' : 'lab',
    };
  }

  const hay = `${finding.name || ''} ${finding.translations?.en?.name || ''}`.toLowerCase();
  for (const entry of AIIMS_REFERENCE_RANGES) {
    if (
      entry.keywords.some((kw) => {
        if (kw.length <= 3) {
          return new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, 'i').test(hay);
        }
        return hay.includes(kw);
      })
    ) {
      return {
        low: entry.low,
        high: entry.high,
        mode: entry.mode,
        displayRange: entry.display,
        source: 'aiims',
      };
    }
  }

  return null;
}

export interface GaugeComputation {
  isNumeric: boolean;
  numericValue: number | null;
  pointerPercent: number;
  zones: Array<{ widthPercent: number; tone: 'red' | 'yellow' | 'green' }>;
  summaryLine: string;
  usedAiimsFallback: boolean;
}

export function computeFindingGauge(
  finding: Finding,
  language: SupportedLanguage
): GaugeComputation {
  const numVal = parseNumericValue(finding.value);
  const range = resolveFindingRange(finding);

  const valueText = `${finding.value}${finding.unit ? ` ${finding.unit}` : ''}`.trim();

  const formatLine = (normalText: string | null) => {
    if (!normalText) {
      if (language === 'hi') return `आपका मान: ${valueText}`;
      if (language === 'or') return `ଆପଣଙ୍କ ମାନ: ${valueText}`;
      return `Your value: ${valueText}.`;
    }
    if (language === 'hi') {
      return `आपका मान: ${valueText}. सामान्य: ${normalText}.`;
    }
    if (language === 'or') {
      return `ଆପଣଙ୍କ ମାନ: ${valueText}. ସ୍ୱାଭାବିକ: ${normalText}.`;
    }
    return `Your value: ${valueText}. Normal: ${normalText}.`;
  };

  if (numVal === null) {
    return {
      isNumeric: false,
      numericValue: null,
      pointerPercent: 50,
      zones: [],
      summaryLine: formatLine(range?.displayRange || finding.reference_range || null),
      usedAiimsFallback: range?.source === 'aiims',
    };
  }

  // Fallback bar positioning when numeric value exists but exact numeric range couldn't be parsed
  if (!range) {
    let pct = 50;
    if (finding.status === 'low') pct = 18;
    else if (finding.status === 'high') pct = 82;
    else if (finding.status === 'critical') pct = 93;

    return {
      isNumeric: true,
      numericValue: numVal,
      pointerPercent: pct,
      zones: [
        { widthPercent: 12, tone: 'red' },
        { widthPercent: 16, tone: 'yellow' },
        { widthPercent: 44, tone: 'green' },
        { widthPercent: 16, tone: 'yellow' },
        { widthPercent: 12, tone: 'red' },
      ],
      summaryLine: formatLine(finding.reference_range || null),
      usedAiimsFallback: finding.range_source === 'general',
    };
  }

  if (range.mode === 'upper_only' && range.high !== null) {
    const high = range.high;
    const borderlineTop = high * 1.25;
    const criticalTop = high * 1.6;
    let pct: number;
    if (numVal <= high) {
      pct = 8 + (Math.max(0, numVal) / (high || 1)) * 44; // 8..52 in green
    } else if (numVal <= borderlineTop) {
      pct = 55 + ((numVal - high) / (borderlineTop - high || 1)) * 21; // 55..76 in yellow
    } else {
      pct = 79 + Math.min(1, (numVal - borderlineTop) / (criticalTop - borderlineTop || 1)) * 17; // 79..96 in red
    }
    return {
      isNumeric: true,
      numericValue: numVal,
      pointerPercent: Math.max(4, Math.min(96, pct)),
      zones: [
        { widthPercent: 54, tone: 'green' },
        { widthPercent: 24, tone: 'yellow' },
        { widthPercent: 22, tone: 'red' },
      ],
      summaryLine: formatLine(range.displayRange),
      usedAiimsFallback: range.source === 'aiims',
    };
  }

  if (range.mode === 'lower_only' && range.low !== null) {
    const low = range.low;
    const borderlineFloor = low * 0.75;
    const criticalFloor = low * 0.45;
    let pct: number;
    if (numVal >= low) {
      pct = 48 + Math.min(1, (numVal - low) / (low * 0.8 || 1)) * 44; // 48..92 in green
    } else if (numVal >= borderlineFloor) {
      pct = 24 + ((numVal - borderlineFloor) / (low - borderlineFloor || 1)) * 20; // 24..44 in yellow
    } else {
      pct = 4 + Math.max(0, (numVal - criticalFloor) / (borderlineFloor - criticalFloor || 1)) * 16; // 4..20 in red
    }
    return {
      isNumeric: true,
      numericValue: numVal,
      pointerPercent: Math.max(4, Math.min(96, pct)),
      zones: [
        { widthPercent: 22, tone: 'red' },
        { widthPercent: 24, tone: 'yellow' },
        { widthPercent: 54, tone: 'green' },
      ],
      summaryLine: formatLine(range.displayRange),
      usedAiimsFallback: range.source === 'aiims',
    };
  }

  // Standard two-sided range: [low, high]
  const low = range.low ?? 0;
  const high = range.high ?? 100;
  const span = Math.max(high - low, 0.01);
  let pct: number;
  if (numVal < low) {
    const deficit = (low - numVal) / (low > 0 ? Math.max(low * 0.35, span * 0.5) : span * 0.5);
    if (deficit <= 0.6 && finding.status !== 'critical') {
      // Borderline low (13% to 27%)
      pct = 27 - (deficit / 0.6) * 14;
    } else {
      // Concerning low (4% to 11%)
      pct = Math.max(4, 11 - Math.min(1, deficit - 0.6) * 7);
    }
  } else if (numVal > high) {
    const excess = (numVal - high) / Math.max(high * 0.35, span * 0.5);
    if (excess <= 0.6 && finding.status !== 'critical') {
      // Borderline high (73% to 87%)
      pct = 73 + (excess / 0.6) * 14;
    } else {
      // Concerning high (89% to 96%)
      pct = Math.min(96, 89 + Math.min(1, excess - 0.6) * 7);
    }
  } else {
    // Normal range (30% to 70%)
    pct = 30 + ((numVal - low) / span) * 40;
  }

  return {
    isNumeric: true,
    numericValue: numVal,
    pointerPercent: Math.max(4, Math.min(96, pct)),
    zones: [
      { widthPercent: 12, tone: 'red' },
      { widthPercent: 16, tone: 'yellow' },
      { widthPercent: 44, tone: 'green' },
      { widthPercent: 16, tone: 'yellow' },
      { widthPercent: 12, tone: 'red' },
    ],
    summaryLine: formatLine(range.displayRange),
    usedAiimsFallback: range.source === 'aiims',
  };
}
