import medicalGlossaryData from '../data/medicalGlossary.json';
import { BodyRegionId, Finding } from '../types/report';
import { SupportedLanguage } from './translations';

export interface GlossaryLocalizedContent {
  title: string;
  analogy: string;
  whatItMeasures: string;
  feelings: {
    low?: string[];
    high?: string[];
    normal?: string[];
    general?: string[];
  };
  doctorQuestion: string;
}

export interface GlossaryFlowStep {
  icon: string;
  label_en: string;
  label_hi: string;
  label_or: string;
}

export interface GlossaryFlowDiagram {
  steps: GlossaryFlowStep[];
  highlightIndexByStatus: Partial<Record<'low' | 'high' | 'critical' | 'normal', number>>;
  captionByStatus: Partial<
    Record<'low' | 'high' | 'normal', { en: string; hi: string; or: string }>
  >;
}

export interface GlossaryEntry {
  id: string;
  kind: 'test' | 'organ';
  aliases: string[];
  analogyIcon: string;
  review_status: string;
  en: GlossaryLocalizedContent;
  hi: GlossaryLocalizedContent;
  or: GlossaryLocalizedContent;
  flowDiagram: GlossaryFlowDiagram;
}

const ALL_ENTRIES = (medicalGlossaryData.entries || []) as GlossaryEntry[];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesAlias(haystack: string, alias: string): boolean {
  const cleanAlias = alias.trim().toLowerCase();
  if (!cleanAlias) return false;
  if (cleanAlias.length <= 4) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanAlias)}([^a-z0-9]|$)`, 'i');
    return re.test(haystack);
  }
  return haystack.includes(cleanAlias);
}

/**
 * Deterministically look up a test or body region in the editable built-in medical glossary.
 */
export function findGlossaryEntryForFinding(finding: Finding): GlossaryEntry | null {
  const rawName = `${finding.translations?.en?.name || ''} ${finding.name || ''}`.toLowerCase().trim();
  if (!rawName) return null;

  // Prefer exact/longest alias match among test entries first, then organ entries
  const ordered = [
    ...ALL_ENTRIES.filter((e) => e.kind === 'test'),
    ...ALL_ENTRIES.filter((e) => e.kind === 'organ'),
  ];

  let bestEntry: GlossaryEntry | null = null;
  let bestLen = 0;

  for (const entry of ordered) {
    for (const alias of entry.aliases) {
      if (matchesAlias(rawName, alias)) {
        const len = alias.trim().length + (entry.kind === 'test' ? 20 : 0);
        if (len > bestLen) {
          bestLen = len;
          bestEntry = entry;
        }
      }
    }
  }

  return bestEntry;
}

export function findGlossaryEntryForRegion(regionId: BodyRegionId): GlossaryEntry | null {
  const idLower = String(regionId).toLowerCase();
  // 1. Direct ID match
  const direct = ALL_ENTRIES.find((e) => e.id.toLowerCase() === idLower);
  if (direct) return direct;

  // 2. Alias match (e.g., shoulder_left -> bones_joints)
  for (const entry of ALL_ENTRIES) {
    if (entry.aliases.some((a) => a.toLowerCase() === idLower)) {
      return entry;
    }
  }

  return null;
}

export function findGlossaryEntryByTopicKey(topicKey: string): GlossaryEntry | null {
  const clean = topicKey.trim().toLowerCase();
  if (!clean) return null;
  const direct = ALL_ENTRIES.find((e) => e.id.toLowerCase() === clean);
  if (direct) return direct;
  return (
    ALL_ENTRIES.find((e) =>
      e.aliases.some((alias) => matchesAlias(clean, alias))
    ) || null
  );
}

export function getGlossaryContentForLanguage(
  entry: GlossaryEntry,
  language: SupportedLanguage
): GlossaryLocalizedContent {
  return entry[language] || entry.en;
}

export function getGlossaryEntryCount(): number {
  return ALL_ENTRIES.length;
}
