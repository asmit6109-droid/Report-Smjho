import mappingData from '../data/medicineVisualMapping.json';
import { MedicineAnalysis } from '../types/medicine';
import { BodyRegionId } from '../types/report';
import { SupportedLanguage } from './translations';

export type MedicineVisualCategoryId =
  | 'pain_fever'
  | 'infection'
  | 'vitamin_supplement'
  | 'stomach_acidity'
  | 'blood_pressure'
  | 'blood_sugar'
  | 'allergy_cold'
  | 'lungs_breathing'
  | 'bones_joints'
  | 'skin'
  | 'thyroid'
  | 'general'
  | 'neutral';

export type MedicineCategoryIconId =
  | 'pain_fever'
  | 'infection'
  | 'vitamin_supplement'
  | 'stomach_acidity'
  | 'blood_pressure'
  | 'blood_sugar'
  | 'allergy_cold'
  | 'lungs_breathing'
  | 'bones_joints'
  | 'skin'
  | 'general'
  | 'neutral';

export interface ResolvedMedicineVisual {
  mode: 'body_region' | 'category_icon' | 'neutral';
  categoryId: MedicineVisualCategoryId;
  iconId: MedicineCategoryIconId;
  /** Highlighted body region ONLY when tied clearly to one anatomical area (or related heart area for BP) */
  bodyRegion: BodyRegionId | null;
  /** Whether the main inline badge should render the mini highlighted body SVG (true) vs category icon (false) */
  preferMiniBodyOnCard: boolean;
  /** Real localized UI text prefix: "Commonly used for:" */
  commonlyUsedForPrefix: string;
  /** Short category / area text localized in currentLanguage */
  shortLabel: string;
  /** Full non-diagnostic line: "Commonly used for: [shortLabel]" */
  fullUsedForLine: string;
  /** Note shown whenever a body region highlight is displayed or available */
  relatedAreaNote: string | null;
  /** Whether a combination or unverified fallback forced the neutral icon */
  fallbackReason: 'none' | 'unverified' | 'combination_unclear' | 'unmapped' | 'steroid_multiple';
}

interface CategoryConfig {
  icon: MedicineCategoryIconId;
  body_region: BodyRegionId | null;
  show_body_map: boolean;
  include_related_region?: boolean;
  label_en: string;
  label_hi: string;
  label_or: string;
  review_status: string;
}

interface SaltMappingRule {
  id: string;
  salts: string[];
  category: MedicineVisualCategoryId;
  review_status: string;
}

const CATEGORIES = mappingData.categories as Record<MedicineVisualCategoryId, CategoryConfig>;
const SALT_RULES = mappingData.salt_mappings as SaltMappingRule[];

const VALID_BODY_REGION_IDS: ReadonlySet<BodyRegionId> = new Set<BodyRegionId>([
  'head',
  'eyes_ears',
  'thyroid',
  'neck_cervical',
  'chest_lungs',
  'heart',
  'abdomen_liver',
  'stomach_intestines',
  'kidney',
  'urinary_system',
  'spine_thoracic',
  'spine_lumbar',
  'shoulder_left',
  'shoulder_right',
  'arms_hands',
  'pelvis',
  'knee_left',
  'knee_right',
  'feet',
  'bones_joints',
  'blood_system',
  'general',
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeSaltSegment(raw: string): string {
  return (raw || '')
    .toLowerCase()
    // Normalize punctuated pharmacopeia tokens (I.P., B.P., U.S.P.)
    .replace(/\b(i\.p\.?|b\.p\.?|u\.s\.p\.?)\b/g, ' ')
    // Strip w/v or w/w before splitting on "/"
    .replace(/\b(w\/v|w\/w|v\/v)\b/g, ' ')
    // Strip dosage strengths such as "500 mg", "500mg", "10 mcg", "5%", "1000 iu", "5 ml"
    .replace(/(?:^|[\s,(/])\d+(?:\.\d+)?\s*(?:mg|mcg|ug|gm|g|ml|iu|%|units?)(?=$|[\s,)/+])/gi, ' ')
    // Strip standalone trailing "%" or unit markers after numbers
    .replace(/\b\d+(?:\.\d+)?\s*%/g, ' ')
    // Strip dosage forms & pharma noise words
    .replace(
      /\b(ip|bp|usp|tablet|tablets|tab|tabs|capsule|capsules|cap|caps|syrup|injection|inj|drops|gel|cream|ointment|suspension|solution|sr|xr|er|cr|mr|dt|md|dr|ds|xl|forte|plus|duo|extra)\b/g,
      ' '
    )
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split active salt string into distinct normalized active ingredients without
 * breaking parenthetical synonyms like "Paracetamol (Acetaminophen)".
 */
export function parseSaltIngredients(saltString: string): string[] {
  const cleaned = (saltString || '').trim();
  if (!cleaned) return [];

  // Strip parenthetical synonyms before splitting (e.g. "Paracetamol (Acetaminophen)")
  const withoutParens = cleaned
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(w\/v|w\/w|v\/v)\b/gi, ' ');

  const parts = withoutParens
    .split(/\s*(?:\+|\/|&|,|\band\b|\bwith\b)\s*/i)
    .map(normalizeSaltSegment)
    .filter((p) => p.length >= 2);

  if (parts.length > 0) {
    return Array.from(new Set(parts));
  }

  const whole = normalizeSaltSegment(cleaned);
  return whole ? [whole] : [];
}

/**
 * Match a single normalized salt ingredient against the static table:
 * 1) Exact match across ALL rules first
 * 2) Partial word-boundary match across ALL rules second
 */
function matchSingleSaltToCategory(ingredient: string): MedicineVisualCategoryId | null {
  const clean = normalizeSaltSegment(ingredient);
  if (!clean) return null;

  // Pass 1: Exact match across all salt rules
  for (const rule of SALT_RULES) {
    for (const candidate of rule.salts) {
      const c = normalizeSaltSegment(candidate);
      if (c && clean === c) {
        return rule.category;
      }
    }
  }

  // Pass 2: Word-boundary partial match across all salt rules
  for (const rule of SALT_RULES) {
    for (const candidate of rule.salts) {
      const c = normalizeSaltSegment(candidate);
      if (!c || c.length < 4) continue;
      const boundaryRe = new RegExp(`(^|\\s)${escapeRegex(c)}(\\s|$)`, 'i');
      if (boundaryRe.test(clean)) {
        return rule.category;
      }
    }
  }

  return null;
}

function getPrefix(lang: SupportedLanguage): string {
  if (lang === 'hi') return 'सामान्य उपयोग:';
  if (lang === 'or') return 'ସାଧାରଣ ବ୍ୟବହାର:';
  return 'Commonly used for:';
}

function getRelatedAreaNote(lang: SupportedLanguage): string {
  if (lang === 'hi') {
    return 'यह केवल संबंधित हिस्सा दिखाता है। यह आपकी स्थिति की पुष्टि नहीं करता।';
  }
  if (lang === 'or') {
    return 'ଏହା କେବଳ ସମ୍ପୃକ୍ତ ଅଂଶ ଦେଖାଏ। ଏହା ଆପଣଙ୍କ ଅବସ୍ଥା ନିଶ୍ଚିତ କରେ ନାହିଁ।';
  }
  return 'Shows a related area. It does not confirm your condition.';
}

function getFallbackLabel(
  lang: SupportedLanguage,
  reason: 'unverified' | 'combination_unclear' | 'unmapped'
): string {
  if (reason === 'combination_unclear') {
    if (lang === 'hi') return 'मिली-जुली दवा (डॉक्टर या फार्मासिस्ट से पूछें)';
    if (lang === 'or') return 'ମିଶ୍ରିତ ଔଷଧ (ଡାକ୍ତର କିମ୍ବା ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ପଚାରନ୍ତୁ)';
    return 'Combination medicine (confirm with doctor or pharmacist)';
  }
  if (lang === 'hi') return 'सामान्य दवा (डॉक्टर या फार्मासिस्ट से पुष्टि करें)';
  if (lang === 'or') return 'ସାଧାରଣ ଔଷଧ (ଡାକ୍ତର କିମ୍ବା ଫାର୍ମାସିଷ୍ଟଙ୍କଠାରୁ ନିଶ୍ଚିତ କରନ୍ତୁ)';
  return 'General medicine (confirm with doctor or pharmacist)';
}

function buildNeutralResult(
  lang: SupportedLanguage,
  reason: 'unverified' | 'combination_unclear' | 'unmapped' | 'steroid_multiple'
): ResolvedMedicineVisual {
  const prefix = getPrefix(lang);
  let shortLabel: string;
  if (reason === 'steroid_multiple') {
    shortLabel =
      lang === 'hi'
        ? 'कई स्थितियों में उपयोग (डॉक्टर से पूछें)'
        : lang === 'or'
        ? 'ବିଭିନ୍ନ ଅବସ୍ଥାରେ ବ୍ୟବହୃତ (ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ)'
        : 'Multiple uses (confirm with doctor)';
  } else {
    shortLabel = getFallbackLabel(lang, reason);
  }
  return {
    mode: 'neutral',
    categoryId: 'neutral',
    iconId: 'neutral',
    bodyRegion: null,
    preferMiniBodyOnCard: false,
    commonlyUsedForPrefix: prefix,
    shortLabel,
    fullUsedForLine: `${prefix} ${shortLabel}`,
    relatedAreaNote: null,
    fallbackReason: reason,
  };
}

function logLookupDebug(info: {
  rawSalts: string;
  normalizedSalts: string[];
  matched: Array<{ salt: string; category: MedicineVisualCategoryId }>;
  unmatched: string[];
  result: ResolvedMedicineVisual;
}) {
  try {
    console.debug('[MedicineVisualLookup]', {
      rawSalts: info.rawSalts || '(none)',
      normalizedSalts: info.normalizedSalts,
      matched: info.matched,
      unmatched: info.unmatched,
      mode: info.result.mode,
      categoryId: info.result.categoryId,
      bodyRegion: info.result.bodyRegion,
      fallbackReason: info.result.fallbackReason,
    });
  } catch {
    // Ignore console errors in restricted environments
  }
}

/**
 * Deterministic visual resolver reading ONLY the static editable JSON lookup table.
 * Rules enforced:
 * 1. If medicine is not verified or is a loose tablet -> neutral icon (never guess).
 * 2. Parse active salt ingredients; normalize lowercase, strip strengths & noise words, split combos.
 * 3. Match exact first, then partial word-boundary match.
 * 4. If unmapped, partly unmapped, or salts map to different body areas/categories -> neutral icon.
 * 5. Verify body_region against BodyMap's exact BodyRegionId allowlist.
 * 6. Emit non-PII console.debug lookup trace.
 */
export function resolveMedicineVisual(
  medicine: MedicineAnalysis,
  language: SupportedLanguage = 'en'
): ResolvedMedicineVisual {
  const primarySalt = (medicine.medicine?.salt || '').trim();
  const verifiedSalt = (medicine.verified_facts?.normalized_salt || '').trim();
  const rawSalts = primarySalt || verifiedSalt;

  let normalizedSalts = parseSaltIngredients(primarySalt);
  if (normalizedSalts.length === 0 && verifiedSalt) {
    normalizedSalts = parseSaltIngredients(verifiedSalt);
  }

  const matched: Array<{ salt: string; category: MedicineVisualCategoryId }> = [];
  const unmatched: string[] = [];

  for (const ing of normalizedSalts) {
    const cat = matchSingleSaltToCategory(ing);
    if (cat) {
      matched.push({ salt: ing, category: cat });
    } else {
      unmatched.push(ing);
    }
  }

  // Rule 1: Unverified medicines or loose tablets MUST fall back to neutral icon
  if (medicine.verification_status !== 'verified' || medicine.is_loose_tablet_only) {
    const res = buildNeutralResult(language, 'unverified');
    logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
    return res;
  }

  if (normalizedSalts.length === 0) {
    const res = buildNeutralResult(language, 'unmapped');
    logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
    return res;
  }

  // Rule 2: Unmapped or partly unmapped combination -> neutral fallback
  if (unmatched.length > 0) {
    const res = buildNeutralResult(
      language,
      normalizedSalts.length > 1 ? 'combination_unclear' : 'unmapped'
    );
    logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
    return res;
  }

  const uniqueCategories = Array.from(new Set(matched.map((m) => m.category)));
  const uniqueBodyRegions = Array.from(
    new Set(
      matched
        .map((m) => CATEGORIES[m.category]?.body_region)
        .filter((r): r is BodyRegionId => Boolean(r))
    )
  );

  // Rule 3: Combination medicines where salts map to different categories or different body areas -> neutral icon
  if (uniqueCategories.length !== 1 || uniqueBodyRegions.length > 1) {
    const res = buildNeutralResult(language, 'combination_unclear');
    logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
    return res;
  }

  const categoryId = uniqueCategories[0];
  if (categoryId === 'neutral') {
    const res = buildNeutralResult(language, 'steroid_multiple');
    logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
    return res;
  }

  const cfg = CATEGORIES[categoryId];
  if (!cfg) {
    const res = buildNeutralResult(language, 'unmapped');
    logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
    return res;
  }

  const validatedBodyRegion =
    cfg.body_region && VALID_BODY_REGION_IDS.has(cfg.body_region) ? cfg.body_region : null;

  const prefix = getPrefix(language);
  const shortLabel =
    language === 'hi' ? cfg.label_hi : language === 'or' ? cfg.label_or : cfg.label_en;

  const hasBodyRegion = Boolean(validatedBodyRegion);
  const preferMiniBodyOnCard = Boolean(cfg.show_body_map && validatedBodyRegion);
  const hasRelatedRegion = Boolean(cfg.show_body_map || cfg.include_related_region);

  const res: ResolvedMedicineVisual = {
    mode: preferMiniBodyOnCard ? 'body_region' : 'category_icon',
    categoryId,
    iconId: cfg.icon,
    bodyRegion: validatedBodyRegion,
    preferMiniBodyOnCard,
    commonlyUsedForPrefix: prefix,
    shortLabel,
    fullUsedForLine: `${prefix} ${shortLabel}`,
    relatedAreaNote: hasBodyRegion && hasRelatedRegion ? getRelatedAreaNote(language) : null,
    fallbackReason: 'none',
  };

  logLookupDebug({ rawSalts, normalizedSalts, matched, unmatched, result: res });
  return res;
}

