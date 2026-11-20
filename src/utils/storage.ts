import { ReportAnalysis, ReportGroup, UserProfile, MarkerTrend } from '../types/report';
import {
  MedicineAnalysis,
  PrescriptionRecord,
  SameSaltPair,
  UserHealthProfile,
} from '../types/medicine';
import { clearAllCaches } from './cache';
import { clearAllFeedback } from './feedbackStorage';

const PROFILE_KEY = 'reportsamjho_user_profile';
const REPORTS_KEY = 'reportsamjho_saved_reports';
const REPORT_GROUPS_KEY = 'reportsamjho_report_groups';
const MEDICINES_KEY = 'reportsamjho_saved_medicines';
const PRESCRIPTIONS_KEY = 'reportsamjho_saved_prescriptions';
const HEALTH_PROFILE_KEY = 'reportsamjho_health_profile';

export function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load profile', err);
  }
  return {
    disclaimerAccepted: false,
    age: null,
    gender: null,
    language: 'en',
  };
}

export function saveStoredProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile', err);
  }
}

export function getStoredReports(): ReportAnalysis[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load reports', err);
  }
  return [];
}

export function saveReportToStorage(report: ReportAnalysis): boolean {
  try {
    const existing = getStoredReports();
    // Check if duplicate ID
    const alreadyExists = existing.some((r) => r.id === report.id);
    if (alreadyExists) {
      return false; // already saved
    }
    const updated = [report, ...existing];
    localStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save report', err);
    return false;
  }
}

export function updateReportInStorage(report: ReportAnalysis): void {
  try {
    const existing = getStoredReports();
    const idx = existing.findIndex((r) => r.id === report.id);
    if (idx !== -1) {
      existing[idx] = report;
      localStorage.setItem(REPORTS_KEY, JSON.stringify(existing));
    }
  } catch (err) {
    console.error('Failed to update report', err);
  }
}

export function deleteReportFromStorage(reportId: string): void {
  try {
    const existing = getStoredReports();
    const filtered = existing.filter((r) => r.id !== reportId);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete report', err);
  }
}

export function clearAllLocalData(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(REPORTS_KEY);
    localStorage.removeItem(REPORT_GROUPS_KEY);
    localStorage.removeItem(MEDICINES_KEY);
    localStorage.removeItem(PRESCRIPTIONS_KEY);
    localStorage.removeItem(HEALTH_PROFILE_KEY);
    clearAllCaches();
    clearAllFeedback();
  } catch (err) {
    console.error('Failed to clear local data', err);
  }
}

export function getStoredReportGroups(): ReportGroup[] {
  try {
    const raw = localStorage.getItem(REPORT_GROUPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load report groups', err);
  }
  return [];
}

export function saveReportGroup(group: ReportGroup): void {
  try {
    const existing = getStoredReportGroups().filter((g) => g.id !== group.id);
    localStorage.setItem(REPORT_GROUPS_KEY, JSON.stringify([group, ...existing]));
  } catch (err) {
    console.error('Failed to save report group', err);
  }
}

export function renameReportGroup(groupId: string, name: string): void {
  try {
    const existing = getStoredReportGroups();
    const updated = existing.map((g) =>
      g.id === groupId
        ? { ...g, name: name.trim() || g.name, updated_at: new Date().toISOString() }
        : g
    );
    localStorage.setItem(REPORT_GROUPS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to rename report group', err);
  }
}

export function deleteReportGroup(groupId: string): void {
  try {
    const existing = getStoredReportGroups().filter((g) => g.id !== groupId);
    localStorage.setItem(REPORT_GROUPS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to delete report group', err);
  }
}

export function getStoredMedicines(): MedicineAnalysis[] {
  try {
    const raw = localStorage.getItem(MEDICINES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load medicines', err);
  }
  return [];
}

export function saveMedicineToStorage(med: MedicineAnalysis): boolean {
  const existing = getStoredMedicines();
  if (existing.some((m) => m.id === med.id)) {
    return false;
  }
  try {
    localStorage.setItem(MEDICINES_KEY, JSON.stringify([med, ...existing]));
    return true;
  } catch (err) {
    // Retry without pack_thumbnail if storage quota is tight
    try {
      const compactMed: MedicineAnalysis = { ...med, pack_thumbnail: undefined };
      localStorage.setItem(MEDICINES_KEY, JSON.stringify([compactMed, ...existing]));
      return true;
    } catch (innerErr) {
      console.error('Failed to save medicine', innerErr || err);
      return false;
    }
  }
}

export function updateMedicineInStorage(med: MedicineAnalysis): void {
  const existing = getStoredMedicines();
  const idx = existing.findIndex((m) => m.id === med.id);
  if (idx === -1) return;
  try {
    existing[idx] = med;
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(existing));
  } catch (err) {
    try {
      existing[idx] = { ...med, pack_thumbnail: undefined };
      localStorage.setItem(MEDICINES_KEY, JSON.stringify(existing));
    } catch (innerErr) {
      console.error('Failed to update medicine', innerErr || err);
    }
  }
}

export function deleteMedicineFromStorage(medId: string): void {
  try {
    const existing = getStoredMedicines();
    localStorage.setItem(
      MEDICINES_KEY,
      JSON.stringify(existing.filter((m) => m.id !== medId))
    );
  } catch (err) {
    console.error('Failed to delete medicine', err);
  }
}

export function getStoredPrescriptions(): PrescriptionRecord[] {
  try {
    const raw = localStorage.getItem(PRESCRIPTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load prescriptions', err);
  }
  return [];
}

export function savePrescriptionToStorage(rx: PrescriptionRecord): void {
  try {
    const existing = getStoredPrescriptions();
    const filtered = existing.filter((p) => p.id !== rx.id);
    localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify([rx, ...filtered]));
  } catch (err) {
    console.error('Failed to save prescription', err);
  }
}

export function getHealthProfile(): UserHealthProfile {
  try {
    const raw = localStorage.getItem(HEALTH_PROFILE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load health profile', err);
  }
  return { allergies: [], conditions: [] };
}

export function saveHealthProfile(hp: UserHealthProfile): void {
  try {
    localStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(hp));
  } catch (err) {
    console.error('Failed to save health profile', err);
  }
}

function tokenizeSalts(saltStr: string | null | undefined): string[] {
  if (!saltStr) return [];
  return saltStr
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(/[+,/&]|\band\b/i)
    .map((s) => s.replace(/\d+\s*(mg|mcg|g|ml|iu|%)/gi, '').trim())
    .filter((s) => s.length >= 4);
}

export function detectSameSaltPairs(medicines: MedicineAnalysis[]): SameSaltPair[] {
  const pairs: SameSaltPair[] = [];
  for (let i = 0; i < medicines.length; i++) {
    const saltsA = tokenizeSalts(medicines[i].medicine.salt);
    if (saltsA.length === 0) continue;
    for (let j = i + 1; j < medicines.length; j++) {
      const saltsB = tokenizeSalts(medicines[j].medicine.salt);
      const overlap = saltsA.find((sa) =>
        saltsB.some((sb) => sb === sa || (sa.length >= 6 && sb.includes(sa)) || (sb.length >= 6 && sa.includes(sb)))
      );
      if (overlap) {
        pairs.push({
          medA: medicines[i],
          medB: medicines[j],
          sharedSalt: overlap.charAt(0).toUpperCase() + overlap.slice(1),
        });
      }
    }
  }
  return pairs;
}

/**
 * Calculates repeating marker trends across all stored reports sorted chronologically
 */
export function calculateMarkerTrends(reports: ReportAnalysis[]): MarkerTrend[] {
  if (!reports || reports.length === 0) return [];

  // Sort chronologically ascending
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const markerMap = new Map<string, { unit: string; history: { date: string; value: number; unit: string; reportId: string }[] }>();

  // Extract numerical findings
  for (const rep of sortedReports) {
    for (const f of rep.findings) {
      const cleanName = f.name.toLowerCase().trim();
      let key = '';
      if (cleanName.includes('glucose') || cleanName.includes('sugar')) {
        key = 'Blood Glucose (Sugar)';
      } else if (cleanName.includes('hba1c')) {
        key = 'HbA1c (3-Month Sugar)';
      } else if (cleanName.includes('hemoglobin') || cleanName.includes('hb')) {
        key = 'Hemoglobin (Hb)';
      } else if (cleanName.includes('cholesterol')) {
        key = 'Total Cholesterol';
      } else if (cleanName.includes('creatinine')) {
        key = 'Serum Creatinine';
      } else if (cleanName.includes('platelet')) {
        key = 'Platelet Count';
      } else if (cleanName.includes('wbc') || cleanName.includes('leukocyte')) {
        key = 'WBC Count';
      }

      if (key) {
        const numVal = parseFloat(String(f.value).replace(/[^0-9.]/g, ''));
        if (!isNaN(numVal)) {
          if (!markerMap.has(key)) {
            markerMap.set(key, { unit: f.unit || '', history: [] });
          }
          const item = markerMap.get(key)!;
          item.history.push({
            date: rep.created_at,
            value: numVal,
            unit: f.unit || item.unit,
            reportId: rep.id,
          });
        }
      }
    }
  }

  const trends: MarkerTrend[] = [];

  markerMap.forEach((val, markerName) => {
    if (val.history.length >= 2) {
      const prev = val.history[val.history.length - 2].value;
      const latest = val.history[val.history.length - 1].value;
      const diff = latest - prev;
      let direction: 'better' | 'same' | 'worse' = 'same';

      // For glucose, hba1c, cholesterol, creatinine: lower is generally better if was high
      const isBadHigh =
        markerName.includes('Glucose') ||
        markerName.includes('HbA1c') ||
        markerName.includes('Cholesterol') ||
        markerName.includes('Creatinine');

      // For hemoglobin, platelets: higher towards normal is better
      const isBadLow = markerName.includes('Hemoglobin') || markerName.includes('Platelet');

      const percentChange = Math.abs(diff / (prev || 1)) * 100;

      if (percentChange < 3) {
        direction = 'same';
      } else if (isBadHigh) {
        direction = diff < 0 ? 'better' : 'worse';
      } else if (isBadLow) {
        direction = diff > 0 ? 'better' : 'worse';
      } else {
        direction = Math.abs(diff) < 0.1 ? 'same' : diff > 0 ? 'better' : 'same';
      }

      trends.push({
        markerName,
        unit: val.unit,
        history: val.history,
        direction,
        changeSummary: `${prev} → ${latest} ${val.unit}`,
      });
    }
  });

  return trends;
}
