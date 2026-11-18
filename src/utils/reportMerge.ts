import {
  CombinedReportData,
  CombinedReportScan,
  Finding,
  ReportAnalysis,
} from '../types/report';
import { buildBodyRegionSummaries } from './bodyMapper';
import { SupportedLanguage } from './translations';

function normalizeToken(val: string | undefined | null): string {
  return (val || '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

export function formatShortScanDate(report: ReportAnalysis): string {
  const raw = report.report_date || report.created_at;
  if (!raw) return '';
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function getSeverityRank(sev: ReportAnalysis['overall_severity']): number {
  if (sev === 'red') return 2;
  if (sev === 'yellow') return 1;
  return 0;
}

function getUrgencyRank(urg: ReportAnalysis['urgency']): number {
  if (urg === 'today') return 2;
  if (urg === 'soon') return 1;
  return 0;
}

function deduplicateStrings(items: string[], maxCount = 6): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const clean = (item || '').trim();
    if (!clean) continue;
    const key = clean
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f\u0b00-\u0b7f]+/g, ' ')
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= maxCount) break;
  }
  return result;
}

function getLocalizedCombinedReason(
  lang: SupportedLanguage,
  severity: ReportAnalysis['overall_severity'],
  scanCount: number,
  worstOriginalReason: string
): string {
  if (worstOriginalReason && scanCount <= 1) return worstOriginalReason;
  if (lang === 'hi') {
    if (severity === 'red') {
      return `${scanCount} स्कैन में से कुछ नतीजों पर आज ही डॉक्टर से मिलना ज़रूरी है।`;
    }
    if (severity === 'yellow') {
      return `${scanCount} स्कैन में कुछ मान सामान्य से अलग हैं — डॉक्टर को दिखाएं।`;
    }
    return `सभी ${scanCount} स्कैन की जांच सामान्य दिख रही है।`;
  }
  if (lang === 'or') {
    if (severity === 'red') {
      return `${scanCount} ସ୍କାନ୍ ମଧ୍ୟରୁ କିଛି ଫଳାଫଳ ପାଇଁ ଆଜି ହିଁ ଡାକ୍ତରଙ୍କୁ ଦେଖାନ୍ତୁ।`;
    }
    if (severity === 'yellow') {
      return `${scanCount} ସ୍କାନ୍‌ରେ କିଛି ମାନ ସ୍ୱାଭାବିକଠାରୁ ଅଲଗା ଅଛି।`;
    }
    return `ସମସ୍ତ ${scanCount} ସ୍କାନ୍ ସ୍ୱାଭାବିକ ଦେଖାଯାଉଛି।`;
  }
  if (severity === 'red') {
    return `Urgent finding found across ${scanCount} combined scans. See a doctor today.`;
  }
  if (severity === 'yellow') {
    return `Some results across ${scanCount} scans need a doctor check.`;
  }
  return `All tests across ${scanCount} scans look within normal limits.`;
}

function detectPersonOrDateMismatch(scans: CombinedReportScan[]): {
  mismatchWarning: boolean;
  mismatchReasons: string[];
} {
  const reasons: string[] = [];
  if (scans.length < 2) {
    return { mismatchWarning: false, mismatchReasons: [] };
  }

  const names = scans
    .map((s) => normalizeToken(s.report.patient_name))
    .filter((n) => n.length >= 2);
  if (names.length >= 2 && new Set(names).size > 1) {
    reasons.push('Different patient names detected');
  }

  const genders = scans
    .map((s) => s.report.patient_gender)
    .filter((g) => g === 'male' || g === 'female');
  if (genders.length >= 2 && new Set(genders).size > 1) {
    reasons.push('Different gender details detected');
  }

  const ages = scans
    .map((s) => s.report.patient_age)
    .filter((a): a is number => typeof a === 'number' && a > 0);
  if (ages.length >= 2 && Math.max(...ages) - Math.min(...ages) >= 5) {
    reasons.push('Different ages listed on reports');
  }

  const timestamps = scans
    .map((s) => {
      const d = new Date(s.report.report_date || s.report.created_at).getTime();
      return Number.isNaN(d) ? null : d;
    })
    .filter((t): t is number => t !== null);

  if (timestamps.length >= 2) {
    const spanDays = (Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24);
    if (spanDays > 45) {
      reasons.push('Report dates are more than 45 days apart');
    }
  }

  return {
    mismatchWarning: reasons.length > 0,
    mismatchReasons: reasons,
  };
}

export function combineReportsClientSide(
  reports: ReportAnalysis[],
  language: SupportedLanguage,
  groupMeta?: { groupId?: string; groupName?: string; isDemo?: boolean }
): CombinedReportData {
  // Sort oldest -> newest so Scan 1, Scan 2 read cleanly chronologically
  const sortedReports = [...reports].sort((a, b) => {
    const ta = new Date(a.report_date || a.created_at).getTime();
    const tb = new Date(b.report_date || b.created_at).getTime();
    return ta - tb;
  });

  const scans: CombinedReportScan[] = sortedReports.map((report, index) => ({
    report,
    label: `Scan ${index + 1}`,
    dateLabel: formatShortScanDate(report),
  }));

  let worstSeverity: ReportAnalysis['overall_severity'] = 'green';
  let worstUrgency: ReportAnalysis['urgency'] = 'routine';
  let worstReason = sortedReports[0]?.severity_reason || '';

  for (const r of sortedReports) {
    if (getSeverityRank(r.overall_severity) > getSeverityRank(worstSeverity)) {
      worstSeverity = r.overall_severity;
      worstReason = r.severity_reason;
    }
    if (getUrgencyRank(r.urgency) > getUrgencyRank(worstUrgency)) {
      worstUrgency = r.urgency;
    }
  }

  // Merge findings:
  // - Exact same name + value + unit => deduplicate once
  // - Same test with DIFFERENT value => keep BOTH clearly labeled with Scan 1 / Scan 2
  const mergedFindings: Finding[] = [];
  const exactFindingIndexByKey = new Map<string, number>();

  scans.forEach((scan) => {
    (scan.report.findings || []).forEach((f, fIdx) => {
      const exactKey = `${normalizeToken(f.name)}|${normalizeToken(f.value)}|${normalizeToken(f.unit)}`;
      const existingIdx = exactFindingIndexByKey.get(exactKey);

      if (existingIdx !== undefined) {
        const existing = mergedFindings[existingIdx];
        if (existing.source_label && !existing.source_label.includes(scan.label)) {
          existing.source_label = `${existing.source_label}, ${scan.label}`;
        }
        return;
      }

      exactFindingIndexByKey.set(exactKey, mergedFindings.length);
      mergedFindings.push({
        ...f,
        id: `${scan.report.id}__${f.id || fIdx}`,
        source_report_id: scan.report.id,
        source_label: scan.label,
        source_date: scan.dateLabel,
      });
    });
  });

  const reportTypeCombined =
    groupMeta?.groupName ||
    sortedReports
      .map((r) => r.translations?.[language]?.report_type || r.report_type)
      .slice(0, 2)
      .join(' + ') + (sortedReports.length > 2 ? ` +${sortedReports.length - 2}` : '');

  const { orderedRegionIds } = buildBodyRegionSummaries(
    mergedFindings,
    reportTypeCombined,
    language
  );

  const symptoms = deduplicateStrings(
    sortedReports.flatMap(
      (r) => r.translations?.[language]?.symptoms_to_watch || r.symptoms_to_watch || []
    ),
    6
  );
  const safeSteps = deduplicateStrings(
    sortedReports.flatMap((r) => r.translations?.[language]?.safe_steps || r.safe_steps || []),
    6
  );
  const doctorQuestions = deduplicateStrings(
    sortedReports.flatMap(
      (r) => r.translations?.[language]?.doctor_questions || r.doctor_questions || []
    ),
    6
  );

  const severityReason = getLocalizedCombinedReason(
    language,
    worstSeverity,
    scans.length,
    worstReason
  );

  const newestReport = sortedReports[sortedReports.length - 1];
  const mergedReport: ReportAnalysis = {
    id: groupMeta?.groupId || `combined-${Date.now()}`,
    created_at: newestReport?.created_at || new Date().toISOString(),
    report_date: newestReport?.report_date,
    report_type: reportTypeCombined || 'Combined Report',
    patient_age: newestReport?.patient_age ?? 40,
    patient_gender: newestReport?.patient_gender ?? 'other',
    overall_severity: worstSeverity,
    severity_reason: severityReason,
    urgency: worstUrgency,
    body_regions_affected: orderedRegionIds,
    findings: mergedFindings,
    symptoms_to_watch: symptoms,
    safe_steps: safeSteps,
    doctor_questions: doctorQuestions,
    language,
    image_quality: 'good',
    isDemo: Boolean(groupMeta?.isDemo || sortedReports.some((r) => r.isDemo)),
    pages_count: sortedReports.reduce((acc, r) => acc + (r.pages_count || 1), 0),
  };

  const mismatch = detectPersonOrDateMismatch(scans);

  return {
    merged: mergedReport,
    scans,
    mismatchWarning: mismatch.mismatchWarning,
    mismatchReasons: mismatch.mismatchReasons,
    groupId: groupMeta?.groupId,
    groupName: groupMeta?.groupName,
    isDemo: Boolean(groupMeta?.isDemo),
  };
}

export function mergeAddedPagesIntoReport(
  baseReport: ReportAnalysis,
  newPageReports: ReportAnalysis[]
): ReportAnalysis {
  if (newPageReports.length === 0) return baseReport;

  const existingFindings = [...(baseReport.findings || [])];
  const existingKeys = new Set(
    existingFindings.map(
      (f) => `${normalizeToken(f.name)}|${normalizeToken(f.value)}|${normalizeToken(f.unit)}`
    )
  );

  let addedPages = 0;
  let worstSeverity = baseReport.overall_severity;
  let worstUrgency = baseReport.urgency;
  let worstReason = baseReport.severity_reason;

  const allSymptoms = [...(baseReport.symptoms_to_watch || [])];
  const allSteps = [...(baseReport.safe_steps || [])];
  const allQuestions = [...(baseReport.doctor_questions || [])];

  newPageReports.forEach((pr, idx) => {
    addedPages += pr.pages_count || 1;
    if (getSeverityRank(pr.overall_severity) > getSeverityRank(worstSeverity)) {
      worstSeverity = pr.overall_severity;
      worstReason = pr.severity_reason || worstReason;
    }
    if (getUrgencyRank(pr.urgency) > getUrgencyRank(worstUrgency)) {
      worstUrgency = pr.urgency;
    }

    (pr.findings || []).forEach((f, fIdx) => {
      const key = `${normalizeToken(f.name)}|${normalizeToken(f.value)}|${normalizeToken(f.unit)}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      existingFindings.push({
        ...f,
        id: f.id || `${baseReport.id}-added-${idx}-${fIdx}-${Date.now()}`,
      });
    });

    allSymptoms.push(...(pr.symptoms_to_watch || []));
    allSteps.push(...(pr.safe_steps || []));
    allQuestions.push(...(pr.doctor_questions || []));
  });

  const { orderedRegionIds } = buildBodyRegionSummaries(
    existingFindings,
    baseReport.report_type,
    baseReport.language || 'en'
  );

  return {
    ...baseReport,
    overall_severity: worstSeverity,
    urgency: worstUrgency,
    severity_reason: worstReason,
    body_regions_affected: orderedRegionIds,
    findings: existingFindings,
    symptoms_to_watch: deduplicateStrings(allSymptoms, 6),
    safe_steps: deduplicateStrings(allSteps, 6),
    doctor_questions: deduplicateStrings(allQuestions, 6),
    pages_count: (baseReport.pages_count || 1) + addedPages,
  };
}
