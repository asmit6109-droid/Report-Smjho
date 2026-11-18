import bodyMappingData from '../data/bodyMapping.json';
import { BodyRegionId, Finding } from '../types/report';
import { SupportedLanguage } from './translations';

export interface BodyMappingEntry {
  id: string;
  keywords: string[];
  body_region: BodyRegionId;
  area_label: string;
  area_label_hi?: string;
  area_label_or?: string;
  short_note: string;
  short_note_hi?: string;
  short_note_or?: string;
  review_status: string;
}

export interface ResolvedBodyMapping {
  bodyRegion: BodyRegionId;
  mappingKind: 'related_lab' | 'affected_injury';
  areaLabel: string;
  shortNote: string;
}

export type RegionSeverity = 'normal' | 'caution' | 'danger';

export interface BodyRegionSummary {
  regionId: BodyRegionId;
  areaLabel: string;
  mappingKind: 'related_lab' | 'affected_injury';
  shortNote: string;
  severity: RegionSeverity;
  findings: Finding[];
}

export const SYSTEMIC_REGION_IDS: ReadonlySet<BodyRegionId> = new Set([
  'bones_joints',
  'blood_system',
  'general',
]);

export const BACK_ONLY_REGION_IDS: ReadonlySet<BodyRegionId> = new Set([
  'neck_cervical',
  'spine_thoracic',
  'spine_lumbar',
  'kidney',
]);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesKeyword(haystack: string, keyword: string): boolean {
  const cleanKey = keyword.trim().toLowerCase();
  if (!cleanKey) return false;
  // For short tokens like t3, t4, hb, c3, alt, ast -> require word boundaries
  if (cleanKey.length <= 4) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(cleanKey)}([^a-z0-9]|$)`, 'i');
    return re.test(haystack);
  }
  return haystack.includes(cleanKey);
}

function pickLocalizedText(
  lang: SupportedLanguage,
  enText: string,
  hiText?: string,
  orText?: string
): string {
  if (lang === 'hi' && hiText) return hiText;
  if (lang === 'or' && orText) return orText;
  return enText;
}

const REGION_DEFAULT_METADATA: Record<
  BodyRegionId,
  { en: string; hi: string; or: string; noteEn: string; noteHi: string; noteOr: string }
> = {
  head: {
    en: 'Head / Brain',
    hi: 'सिर / मस्तिष्क',
    or: 'ମୁଣ୍ଡ / ମସ୍ତିଷ୍କ',
    noteEn: 'Area checked in this report.',
    noteHi: 'रिपोर्ट में इस हिस्से की जांच हुई है।',
    noteOr: 'ଏହି ଅଂଶର ପରୀକ୍ଷା ହୋଇଛି।',
  },
  eyes_ears: {
    en: 'Eyes & Ears',
    hi: 'आंखें और कान',
    or: 'ଆଖି ଏବଂ କାନ',
    noteEn: 'Related to vision or hearing findings.',
    noteHi: 'आंख या कान की जांच से संबंधित।',
    noteOr: 'ଆଖି କିମ୍ବା କାନ ପରୀକ୍ଷା ସହିତ ଜଡ଼ିତ।',
  },
  thyroid: {
    en: 'Neck / Thyroid',
    hi: 'गला / थायरॉइड',
    or: 'ବେକ / ଥାଇରଏଡ୍',
    noteEn: 'Thyroid hormones help control your energy, weight, and body speed.',
    noteHi: 'थायरॉइड हार्मोन शरीर की ऊर्जा और गति को संतुलित रखते हैं।',
    noteOr: 'ଥାଇରଏଡ୍ ହରମୋନ୍ ଶରୀରର ଶକ୍ତି ଏବଂ ଗତି ନିୟନ୍ତ୍ରଣ କରେ।',
  },
  neck_cervical: {
    en: 'Neck / Cervical Spine',
    hi: 'गर्दन की रीढ़',
    or: 'ବେକ ମେରୁଦଣ୍ଡ',
    noteEn: 'Upper neck spine area.',
    noteHi: 'गर्दन के पीछे की रीढ़ का हिस्सा।',
    noteOr: 'ବେକ ପଛ ମେରୁଦଣ୍ଡ ଅଂଶ।',
  },
  chest_lungs: {
    en: 'Lungs & Chest',
    hi: 'फेफड़े और छाती',
    or: 'ଫୁସଫୁସ ଏବଂ ଛାତି',
    noteEn: 'Lungs bring oxygen into your blood when you breathe.',
    noteHi: 'फेफड़े सांस के जरिए शरीर में ऑक्सीजन पहुंचाते हैं।',
    noteOr: 'ଫୁସଫୁସ ନିଶ୍ୱାସ ଦ୍ୱାରା ଅମ୍ଳଜାନ ଯୋଗାଏ।',
  },
  heart: {
    en: 'Heart & Blood Vessels',
    hi: 'दिल और नसें',
    or: 'ହୃଦୟ ଏବଂ ରକ୍ତନଳୀ',
    noteEn: 'Related to blood fats or heart circulation markers.',
    noteHi: 'खून की चर्बी और दिल की सेहत से जुड़ा क्षेत्र।',
    noteOr: 'ରକ୍ତରେ ଚର୍ବି ଏବଂ ହୃଦୟ ସ୍ୱାସ୍ଥ୍ୟ ସହିତ ଜଡ଼ିତ।',
  },
  abdomen_liver: {
    en: 'Liver',
    hi: 'लिवर (यकृत)',
    or: 'ଯକୃତ (ଲିଭର)',
    noteEn: 'The liver helps digest food, store energy, and clear toxins.',
    noteHi: 'लिवर खाना पचाने और गंदगी साफ करने में मदद करता है।',
    noteOr: 'ଲିଭର ଖାଦ୍ୟ ହଜମ ଏବଂ ଶରୀର ସଫା କରିବାରେ ସାହାଯ୍ୟ କରେ।',
  },
  stomach_intestines: {
    en: 'Stomach & Intestines',
    hi: 'पेट और आंतें',
    or: 'ପାକସ୍ଥଳୀ ଏବଂ ଅନ୍ତନଳୀ',
    noteEn: 'Related to stomach and digestion.',
    noteHi: 'पेट और पाचन से संबंधित हिस्सा।',
    noteOr: 'ପାକସ୍ଥଳୀ ଏବଂ ହଜମ ସହିତ ଜଡ଼ିତ।',
  },
  kidney: {
    en: 'Kidneys',
    hi: 'गुर्दे (किडनी)',
    or: 'କିଡନୀ (ବୃକ୍କ)',
    noteEn: 'Kidneys clean waste from your blood and balance body water.',
    noteHi: 'किडनी खून से गंदगी साफ करती हैं और पानी संतुलित रखती हैं।',
    noteOr: 'କିଡନୀ ରକ୍ତରୁ ବର୍ଜ୍ୟ ସଫା କରେ ଏବଂ ଜଳ ସନ୍ତୁଳନ ରଖେ।',
  },
  urinary_system: {
    en: 'Urinary System',
    hi: 'मूत्र प्रणाली',
    or: 'ମୂତ୍ର ପ୍ରଣାଳୀ',
    noteEn: 'Checks urine for hydration and urinary health.',
    noteHi: 'पेशाब की जांच से संक्रमण और पानी की स्थिति दिखती है।',
    noteOr: 'ପରିସ୍ରା ପରୀକ୍ଷାରୁ ମୂତ୍ର ସ୍ୱାସ୍ଥ୍ୟ ଜଣାପଡ଼େ।',
  },
  spine_thoracic: {
    en: 'Upper / Mid Back Spine',
    hi: 'पीठ की ऊपरी रीढ़',
    or: 'ମଝି ପିଠି ମେରୁଦଣ୍ଡ',
    noteEn: 'Middle back spine area.',
    noteHi: 'पीठ के ऊपरी व बीच के हिस्से की रीढ़।',
    noteOr: 'ମଝି ପିଠି ମେରୁଦଣ୍ଡ ଅଂଶ।',
  },
  spine_lumbar: {
    en: 'Lower Back Spine',
    hi: 'कमर की रीढ़',
    or: 'ଅଣ୍ଟା ମେରୁଦଣ୍ଡ',
    noteEn: 'Lower back spine area.',
    noteHi: 'कमर के निचले हिस्से की रीढ़।',
    noteOr: 'ତଳ ଅଣ୍ଟା ମେରୁଦଣ୍ଡ ଅଂଶ।',
  },
  shoulder_left: {
    en: 'Left Shoulder',
    hi: 'बायां कंधा',
    or: 'ବାମ କାନ୍ଧ',
    noteEn: 'Left shoulder joint area.',
    noteHi: 'बाएं कंधे का जोड़ और हिस्सा।',
    noteOr: 'ବାମ କାନ୍ଧର ଅଂଶ।',
  },
  shoulder_right: {
    en: 'Right Shoulder',
    hi: 'दायां कंधा',
    or: 'ଡାହାଣ କାନ୍ଧ',
    noteEn: 'Right shoulder joint area.',
    noteHi: 'दाएं कंधे का जोड़ और हिस्सा।',
    noteOr: 'ଡାହାଣ କାନ୍ଧର ଅଂଶ।',
  },
  arms_hands: {
    en: 'Arms & Hands',
    hi: 'बांह और हाथ',
    or: 'ବାହୁ ଏବଂ ହାତ',
    noteEn: 'Arm, wrist, or hand area.',
    noteHi: 'बांह, कलाई या हाथ का हिस्सा।',
    noteOr: 'ବାହୁ, କଲାଇ କିମ୍ବା ହାତ ଅଂଶ।',
  },
  pelvis: {
    en: 'Hips / Pelvis',
    hi: 'कूल्हा / पेल्विस',
    or: 'କଟି / ପେଲଭିସ୍',
    noteEn: 'Hip and pelvic region.',
    noteHi: 'कूल्हे और कमर के निचले हिस्से का क्षेत्र।',
    noteOr: 'କଟି ଏବଂ ପେଲଭିସ୍ ଅଂଶ।',
  },
  knee_left: {
    en: 'Left Knee',
    hi: 'बायां घुटना',
    or: 'ବାମ ଆଣ୍ଠୁ',
    noteEn: 'Left knee joint area.',
    noteHi: 'बाएं घुटने का जोड़।',
    noteOr: 'ବାମ ଆଣ୍ଠୁ ଅଂଶ।',
  },
  knee_right: {
    en: 'Right Knee',
    hi: 'दायां घुटना',
    or: 'ଡାହାଣ ଆଣ୍ଠୁ',
    noteEn: 'Right knee joint area.',
    noteHi: 'दाएं घुटने का जोड़।',
    noteOr: 'ଡାହାଣ ଆଣ୍ଠୁ ଅଂଶ।',
  },
  feet: {
    en: 'Ankles & Feet',
    hi: 'टखना और पैर',
    or: 'ଗୋଇଠି ଏବଂ ପାଦ',
    noteEn: 'Ankle and foot area.',
    noteHi: 'टखने और पैर का हिस्सा।',
    noteOr: 'ଗୋଇଠି ଏବଂ ପାଦ ଅଂଶ।',
  },
  bones_joints: {
    en: 'Bones & Muscles (General)',
    hi: 'हड्डियां और मांसपेशियां (सामान्य)',
    or: 'ହାଡ଼ ଏବଂ ମାଂସପେଶୀ (ସାଧାରଣ)',
    noteEn: 'Supports strength across all bones and muscles, not a single specific bone.',
    noteHi: 'पूरे शरीर की हड्डियों और मांसपेशियों की ताकत से जुड़ा है।',
    noteOr: 'ସମଗ୍ର ହାଡ଼ ଏବଂ ମାଂସପେଶୀର ଶକ୍ତି ସହିତ ଜଡ଼ିତ।',
  },
  blood_system: {
    en: 'Blood / General',
    hi: 'खून / सामान्य शरीर',
    or: 'ରକ୍ତ / ସାଧାରଣ',
    noteEn: 'Circulates throughout your whole body.',
    noteHi: 'पूरे शरीर के खून में प्रवाहित होने वाले तत्व।',
    noteOr: 'ସମଗ୍ର ଶରୀରର ରକ୍ତ ପ୍ରବାହ ସହିତ ଜଡ଼ିତ।',
  },
  general: {
    en: 'General Health',
    hi: 'सामान्य स्वास्थ्य',
    or: 'ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ',
    noteEn: 'General health marker.',
    noteHi: 'सामान्य स्वास्थ्य जांच।',
    noteOr: 'ସାଧାରଣ ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷା।',
  },
};

export function getRegionLabel(regionId: BodyRegionId, language: SupportedLanguage): string {
  const meta = REGION_DEFAULT_METADATA[regionId] || REGION_DEFAULT_METADATA.general;
  return pickLocalizedText(language, meta.en, meta.hi, meta.or);
}

/**
 * Deterministically resolve a single Finding against the fixed bodyMapping.json table.
 * NEVER invents a mapping. Returns null if no rule in bodyMapping.json matches AND
 * the text does not explicitly name an anatomical injury/location rule.
 */
export function resolveFindingBodyMapping(
  finding: Finding,
  reportType = '',
  language: SupportedLanguage = 'en'
): ResolvedBodyMapping | null {
  const nameText = `${finding.name || ''} ${finding.translations?.en?.name || ''}`.toLowerCase();
  const fullText = `${nameText} ${finding.short_explanation || ''} ${reportType || ''}`.toLowerCase();

  // 1. Check explicit injury / imaging location rules first (only if anatomical location named in text)
  const injuryRules = (bodyMappingData.injury_location_rules || []) as BodyMappingEntry[];
  for (const rule of injuryRules) {
    if (rule.keywords.some((kw) => matchesKeyword(fullText, kw))) {
      return {
        bodyRegion: rule.body_region,
        mappingKind: 'affected_injury',
        areaLabel: pickLocalizedText(language, rule.area_label, rule.area_label_hi, rule.area_label_or),
        shortNote: pickLocalizedText(language, rule.short_note, rule.short_note_hi, rule.short_note_or),
      };
    }
  }

  // 2. Check fixed lab test -> related body area lookup table
  const labRules = (bodyMappingData.lab_mappings || []) as BodyMappingEntry[];
  for (const rule of labRules) {
    if (rule.keywords.some((kw) => matchesKeyword(nameText, kw))) {
      return {
        bodyRegion: rule.body_region,
        mappingKind: 'related_lab',
        areaLabel: pickLocalizedText(language, rule.area_label, rule.area_label_hi, rule.area_label_or),
        shortNote: pickLocalizedText(language, rule.short_note, rule.short_note_hi, rule.short_note_or),
      };
    }
  }

  return null;
}

export function isAbnormalStatus(status: Finding['status']): boolean {
  return status === 'low' || status === 'high' || status === 'critical';
}

export function buildBodyRegionSummaries(
  findings: Finding[],
  reportType = '',
  language: SupportedLanguage = 'en'
): {
  regions: Record<string, BodyRegionSummary>;
  orderedRegionIds: BodyRegionId[];
  unmappedAbnormalFindings: Finding[];
  mappedRegionIdsForFinding: Record<string, BodyRegionId | null>;
} {
  const regions: Record<string, BodyRegionSummary> = {};
  const orderedRegionIds: BodyRegionId[] = [];
  const unmappedAbnormalFindings: Finding[] = [];
  const mappedRegionIdsForFinding: Record<string, BodyRegionId | null> = {};

  for (const finding of findings) {
    const resolved = resolveFindingBodyMapping(finding, reportType, language);
    if (!resolved) {
      mappedRegionIdsForFinding[finding.id] = null;
      if (isAbnormalStatus(finding.status)) {
        unmappedAbnormalFindings.push(finding);
      }
      continue;
    }

    const regionId = resolved.bodyRegion;
    mappedRegionIdsForFinding[finding.id] = regionId;

    // Rule: Highlight a body region Red ONLY for findings with status === 'critical'.
    // High/Low abnormal findings highlight Amber ('caution').
    const findingSeverity: RegionSeverity =
      finding.status === 'critical'
        ? 'danger'
        : finding.status === 'high' || finding.status === 'low'
        ? 'caution'
        : 'normal';

    if (!regions[regionId]) {
      regions[regionId] = {
        regionId,
        areaLabel: resolved.areaLabel,
        mappingKind: resolved.mappingKind,
        shortNote: resolved.shortNote,
        severity: findingSeverity,
        findings: [{ ...finding, mapping_kind: resolved.mappingKind }],
      };
      orderedRegionIds.push(regionId);
    } else {
      const existing = regions[regionId];
      existing.findings.push({ ...finding, mapping_kind: resolved.mappingKind });
      // Escalate severity strictly based on finding severity
      if (findingSeverity === 'danger') {
        existing.severity = 'danger';
      } else if (findingSeverity === 'caution' && existing.severity === 'normal') {
        existing.severity = 'caution';
      }
      // If any finding in this region is explicit anatomical injury, surface Affected area
      if (resolved.mappingKind === 'affected_injury') {
        existing.mappingKind = 'affected_injury';
      }
    }
  }

  // Sort highlighted regions: danger first, then caution, then normal
  const rank = (s: RegionSeverity) => (s === 'danger' ? 0 : s === 'caution' ? 1 : 2);
  orderedRegionIds.sort((a, b) => rank(regions[a].severity) - rank(regions[b].severity));

  return {
    regions,
    orderedRegionIds,
    unmappedAbnormalFindings,
    mappedRegionIdsForFinding,
  };
}
