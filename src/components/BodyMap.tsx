import React, { useMemo, useState, useEffect } from 'react';
import { BodyRegionId, Finding, SeverityLevel } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import {
  BACK_ONLY_REGION_IDS,
  BodyRegionSummary,
  buildBodyRegionSummaries,
  RegionSeverity,
  SYSTEMIC_REGION_IDS,
} from '../utils/bodyMapper';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Droplets,
  Bone,
  Activity,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';

interface BodyMapProps {
  affectedRegions: BodyRegionId[];
  findings: Finding[];
  overallSeverity: SeverityLevel;
  reportType?: string;
  language: SupportedLanguage;
  onViewFinding?: (findingId: string) => void;
}

const SEVERITY_COLORS: Record<RegionSeverity, { fill: string; softBg: string; text: string }> = {
  normal: {
    fill: '#16A34A',
    softBg: 'bg-[var(--color-normal-soft)]',
    text: 'text-[var(--color-normal)]',
  },
  caution: {
    fill: '#F59E0B',
    softBg: 'bg-[var(--color-caution-soft)]',
    text: 'text-[var(--color-text)]',
  },
  danger: {
    fill: '#DC2626',
    softBg: 'bg-[var(--color-danger-soft)]',
    text: 'text-[var(--color-danger)]',
  },
};

function getLocalizedUiCopy(lang: SupportedLanguage) {
  if (lang === 'hi') {
    return {
      title: 'शरीर के संबंधित हिस्से',
      relatedArea: 'संबंधित शरीर का हिस्सा',
      affectedArea: 'प्रभावित हिस्सा',
      relatedFindings: 'संबंधित जांच',
      whatThisMeans: 'इसका सरल मतलब',
      viewDetails: 'जांच का विवरण देखें',
      disclaimer: 'यह केवल संबंधित हिस्सा दिखाता है। यह किसी नुकसान की पुष्टि नहीं करता।',
      otherUnmapped: 'अन्य जांच (बिना शरीर मानचित्र)',
      noRegions: 'इस रिपोर्ट में कोई विशिष्ट अंग चिह्नित नहीं है।',
      normalLabel: 'सामान्य',
      cautionLabel: 'ध्यान दें',
      dangerLabel: 'गंभीर',
      lowBadge: 'कम',
      highBadge: 'ज्यादा',
      criticalBadge: 'गंभीर',
      tapHint: 'विवरण देखने के लिए रंगीन हिस्से या नाम पर टैप करें',
    };
  }
  if (lang === 'or') {
    return {
      title: 'ଶରୀରର ସମ୍ପୃକ୍ତ ଅଂଶ',
      relatedArea: 'ସମ୍ପୃକ୍ତ ଶରୀର ଅଂଶ',
      affectedArea: 'ପ୍ରଭାବିତ ଅଂଶ',
      relatedFindings: 'ସମ୍ପୃକ୍ତ ପରୀକ୍ଷା',
      whatThisMeans: 'ଏହାର ସରଳ ଅର୍ଥ',
      viewDetails: 'ପରୀକ୍ଷା ବିବରଣୀ ଦେଖନ୍ତୁ',
      disclaimer: 'ଏହା କେବଳ ସମ୍ପୃକ୍ତ ଅଂଶ ଦେଖାଏ। ଏହା କୌଣସି କ୍ଷତି ନିଶ୍ଚିତ କରେ ନାହିଁ।',
      otherUnmapped: 'ଅନ୍ୟାନ୍ୟ ପରୀକ୍ଷା',
      noRegions: 'ଏହି ରିପୋର୍ଟରେ କୌଣସି ନିର୍ଦ୍ଦିଷ୍ଟ ଅଙ୍ଗ ଚିହ୍ନିତ ନାହିଁ।',
      normalLabel: 'ସ୍ୱାଭାବିକ',
      cautionLabel: 'ସାବଧାନ',
      dangerLabel: 'ଜରୁରୀ',
      lowBadge: 'କମ୍',
      highBadge: 'ଅଧିକ',
      criticalBadge: 'ଅତ୍ୟଧିକ',
      tapHint: 'ବିବରଣୀ ଦେଖିବାକୁ ରଙ୍ଗୀନ ଅଂଶ ଉପରେ ଚିପନ୍ତୁ',
    };
  }
  return {
    title: 'Body Overview',
    relatedArea: 'Related body area',
    affectedArea: 'Affected area',
    relatedFindings: 'Related findings',
    whatThisMeans: 'What this means',
    viewDetails: 'View test details',
    disclaimer: 'This shows a related area. It does not confirm damage.',
    otherUnmapped: 'Other findings',
    noRegions: 'No specific body regions are highlighted for this report.',
    normalLabel: 'Normal',
    cautionLabel: 'Be careful',
    dangerLabel: 'Urgent',
    lowBadge: 'Low',
    highBadge: 'High',
    criticalBadge: 'Critical',
    tapHint: 'Tap any highlighted part or tag to see details',
  };
}

export const BodyMap: React.FC<BodyMapProps> = ({
  findings,
  reportType = '',
  language,
  onViewFinding,
}) => {
  const t = translations[language];
  const ui = getLocalizedUiCopy(language);

  const summaryData = useMemo(
    () => buildBodyRegionSummaries(findings, reportType, language),
    [findings, reportType, language]
  );

  const { regions, orderedRegionIds } = summaryData;

  const [viewMode, setViewMode] = useState<'front' | 'back'>(() => {
    const firstAnatomical = orderedRegionIds.find((id) => !SYSTEMIC_REGION_IDS.has(id));
    if (firstAnatomical && BACK_ONLY_REGION_IDS.has(firstAnatomical)) return 'back';
    return 'front';
  });

  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegionId | null>(null);

  // Switch default Front/Back view cleanly when switching between scans
  useEffect(() => {
    const firstAnatomical = orderedRegionIds.find((id) => !SYSTEMIC_REGION_IDS.has(id));
    if (firstAnatomical && BACK_ONLY_REGION_IDS.has(firstAnatomical)) {
      setViewMode('back');
    } else if (firstAnatomical) {
      setViewMode('front');
    }
    setSelectedRegionId(null);
  }, [orderedRegionIds]);

  const activeRegionSummary: BodyRegionSummary | null = selectedRegionId
    ? regions[selectedRegionId] || null
    : null;

  const systemicIds = orderedRegionIds.filter((id) => SYSTEMIC_REGION_IDS.has(id));
  const anatomicalIds = orderedRegionIds.filter((id) => !SYSTEMIC_REGION_IDS.has(id));

  const isHighlighted = (regionId: BodyRegionId) => Boolean(regions[regionId]);

  const getRegionVisual = (regionId: BodyRegionId) => {
    const summary = regions[regionId];
    if (!summary) {
      return {
        highlighted: false,
        fill: '#E5E7EB',
        glow: 'none',
        opacity: 0.35,
      };
    }
    const color = SEVERITY_COLORS[summary.severity].fill;
    return {
      highlighted: true,
      fill: color,
      glow: color,
      opacity: 0.88,
    };
  };

  const handleTapRegion = (regionId: BodyRegionId) => {
    if (!regions[regionId]) return;
    setSelectedRegionId(regionId);
    // Automatically align view if tapping an item from pills below diagram
    if (!SYSTEMIC_REGION_IDS.has(regionId)) {
      if (BACK_ONLY_REGION_IDS.has(regionId)) {
        setViewMode('back');
      } else if (regionId === 'thyroid' || regionId === 'heart' || regionId === 'chest_lungs' || regionId === 'abdomen_liver' || regionId === 'stomach_intestines' || regionId === 'urinary_system' || regionId === 'eyes_ears') {
        setViewMode('front');
      }
    }
  };

  const renderSeverityIcon = (sev: RegionSeverity, className = 'w-4 h-4 shrink-0') => {
    if (sev === 'danger') {
      return <AlertOctagon className={`${className} text-[var(--color-danger)]`} />;
    }
    if (sev === 'caution') {
      return <AlertTriangle className={`${className} text-[var(--color-caution)]`} />;
    }
    return <CheckCircle2 className={`${className} text-[var(--color-normal)]`} />;
  };

  const renderStatusBadge = (status: Finding['status']) => {
    if (status === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-soft)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--color-danger)]">
          <AlertOctagon className="w-3.5 h-3.5" />
          {ui.criticalBadge}
        </span>
      );
    }
    if (status === 'high') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-caution-soft)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--color-text)]">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-caution)]" />
          {ui.highBadge}
        </span>
      );
    }
    if (status === 'low') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-caution-soft)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--color-text)]">
          <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-caution)]" />
          {ui.lowBadge}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-normal-soft)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--color-normal)]">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {ui.normalLabel}
      </span>
    );
  };

  // Helper to render SVG zone with lightweight soft glow halo when active
  const renderZoneGlowCircle = (
    regionId: BodyRegionId,
    cx: number,
    cy: number,
    r: number
  ) => {
    const v = getRegionVisual(regionId);
    return (
      <g
        onClick={() => handleTapRegion(regionId)}
        className={v.highlighted ? 'cursor-pointer' : 'pointer-events-none'}
      >
        {v.highlighted && (
          <circle cx={cx} cy={cy} r={r + 6} fill={v.glow} fillOpacity={0.22} />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={v.fill}
          fillOpacity={v.opacity}
          stroke={v.highlighted ? '#FFFFFF' : 'none'}
          strokeWidth={v.highlighted ? 1.8 : 0}
        />
      </g>
    );
  };

  const renderZoneGlowPath = (regionId: BodyRegionId, d: string) => {
    const v = getRegionVisual(regionId);
    return (
      <g
        onClick={() => handleTapRegion(regionId)}
        className={v.highlighted ? 'cursor-pointer' : 'pointer-events-none'}
      >
        {v.highlighted && (
          <path d={d} fill={v.glow} fillOpacity={0.22} stroke={v.glow} strokeWidth={7} strokeLinejoin="round" strokeOpacity={0.22} />
        )}
        <path
          d={d}
          fill={v.fill}
          fillOpacity={v.opacity}
          stroke={v.highlighted ? '#FFFFFF' : 'none'}
          strokeWidth={v.highlighted ? 1.6 : 0}
          strokeLinejoin="round"
        />
      </g>
    );
  };

  const renderZoneGlowRect = (
    regionId: BodyRegionId,
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number
  ) => {
    const v = getRegionVisual(regionId);
    return (
      <g
        onClick={() => handleTapRegion(regionId)}
        className={v.highlighted ? 'cursor-pointer' : 'pointer-events-none'}
      >
        {v.highlighted && (
          <rect
            x={x - 4}
            y={y - 4}
            width={width + 8}
            height={height + 8}
            rx={rx + 3}
            fill={v.glow}
            fillOpacity={0.22}
          />
        )}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={rx}
          fill={v.fill}
          fillOpacity={v.opacity}
          stroke={v.highlighted ? '#FFFFFF' : 'none'}
          strokeWidth={v.highlighted ? 1.6 : 0}
        />
      </g>
    );
  };

  return (
    <>
      <div className="rs-card p-5 space-y-4">
        {/* Header + Front/Back Switcher */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-extrabold text-[var(--color-text)] text-base">{ui.title}</h3>

          <div className="inline-flex rounded-[12px] bg-[var(--color-surface-subtle)] p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => setViewMode('front')}
              className={`rounded-[10px] px-3 py-1.5 transition ${
                viewMode === 'front'
                  ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {t.frontView}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('back')}
              className={`rounded-[10px] px-3 py-1.5 transition ${
                viewMode === 'back'
                  ? 'bg-[var(--color-surface)] text-[var(--color-brand)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {t.backView}
            </button>
          </div>
        </div>

        {/* Clean 2D Flat SVG Silhouette + Smooth Opacity Switch */}
        <div className="flex flex-col items-center">
          <div className="relative w-52 h-80 flex items-center justify-center">
            {/* FRONT SVG */}
            <svg
              viewBox="0 0 240 385"
              className={`absolute inset-0 w-full h-full select-none transition-all duration-200 ${
                viewMode === 'front'
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
              aria-label="Human body front view"
            >
              {/* Soft Gray Body Silhouette */}
              <g fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2.2" strokeLinejoin="round">
                {/* Head */}
                <circle cx="120" cy="40" r="23" />
                {/* Ears subtle */}
                <path d="M 96 36 C 92 36 92 46 96 46" fill="#F3F4F6" />
                <path d="M 144 36 C 148 36 148 46 144 46" fill="#F3F4F6" />
                {/* Neck */}
                <path d="M 111 62 L 111 80 L 129 80 L 129 62 Z" />
                {/* Torso */}
                <path d="M 84 80 L 156 80 L 148 175 L 92 175 Z" />
                {/* Pelvis / Hips */}
                <path d="M 92 175 L 148 175 L 142 210 L 98 210 Z" />
                {/* Left Arm + Hand */}
                <path d="M 84 83 L 60 152 L 50 220 L 63 222 L 73 156 L 90 92 Z" />
                {/* Right Arm + Hand */}
                <path d="M 156 83 L 180 152 L 190 220 L 177 222 L 167 156 L 150 92 Z" />
                {/* Left Leg + Foot */}
                <path d="M 98 210 L 92 288 L 88 355 L 108 355 L 114 288 L 117 210 Z" />
                <ellipse cx="97" cy="364" rx="13" ry="7" />
                {/* Right Leg + Foot */}
                <path d="M 123 210 L 126 288 L 132 355 L 152 355 L 148 288 L 142 210 Z" />
                <ellipse cx="143" cy="364" rx="13" ry="7" />
              </g>

              {/* Head / Brain */}
              {renderZoneGlowCircle('head', 120, 36, 17)}

              {/* Eyes & Ears */}
              <g
                onClick={() => handleTapRegion('eyes_ears')}
                className={isHighlighted('eyes_ears') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowCircle('eyes_ears', 111, 40, 4.5)}
                {renderZoneGlowCircle('eyes_ears', 129, 40, 4.5)}
                {renderZoneGlowCircle('eyes_ears', 96, 41, 4)}
                {renderZoneGlowCircle('eyes_ears', 144, 41, 4)}
              </g>

              {/* Thyroid (butterfly at front neck) */}
              {renderZoneGlowPath(
                'thyroid',
                'M 111 68 C 111 64 118 65 120 69 C 122 65 129 64 129 68 C 129 74 123 76 120 73 C 117 76 111 74 111 68 Z'
              )}

              {/* Lungs (left & right chest) */}
              <g
                onClick={() => handleTapRegion('chest_lungs')}
                className={isHighlighted('chest_lungs') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowPath(
                  'chest_lungs',
                  'M 95 92 Q 108 86 116 95 L 116 124 Q 102 126 95 120 Z'
                )}
                {renderZoneGlowPath(
                  'chest_lungs',
                  'M 145 92 Q 132 86 124 95 L 124 124 Q 138 126 145 120 Z'
                )}
              </g>

              {/* Heart (slightly left chest / anatomical right side on diagram) */}
              {renderZoneGlowCircle('heart', 127, 108, 10)}

              {/* Liver (right abdomen / left side on viewer diagram) */}
              {renderZoneGlowPath(
                'abdomen_liver',
                'M 95 130 L 126 130 Q 124 146 97 148 Z'
              )}

              {/* Stomach & Intestines */}
              {renderZoneGlowPath(
                'stomach_intestines',
                'M 122 134 Q 142 132 143 149 Q 142 167 120 168 Q 98 167 99 152 L 122 150 Z'
              )}

              {/* Urinary System (bladder region) */}
              {renderZoneGlowCircle('urinary_system', 120, 182, 9)}

              {/* Hips / Pelvis */}
              {renderZoneGlowPath('pelvis', 'M 95 186 L 145 186 L 140 205 L 100 205 Z')}

              {/* Shoulders */}
              {renderZoneGlowCircle('shoulder_left', 82, 87, 9)}
              {renderZoneGlowCircle('shoulder_right', 158, 87, 9)}

              {/* Arms & Hands */}
              <g
                onClick={() => handleTapRegion('arms_hands')}
                className={isHighlighted('arms_hands') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowPath('arms_hands', 'M 65 142 L 73 144 L 62 218 L 52 216 Z')}
                {renderZoneGlowPath('arms_hands', 'M 175 142 L 167 144 L 178 218 L 188 216 Z')}
              </g>

              {/* Knees */}
              {renderZoneGlowCircle('knee_left', 103, 282, 10)}
              {renderZoneGlowCircle('knee_right', 137, 282, 10)}

              {/* Feet */}
              <g
                onClick={() => handleTapRegion('feet')}
                className={isHighlighted('feet') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowCircle('feet', 97, 362, 10)}
                {renderZoneGlowCircle('feet', 143, 362, 10)}
              </g>
            </svg>

            {/* BACK SVG */}
            <svg
              viewBox="0 0 240 385"
              className={`absolute inset-0 w-full h-full select-none transition-all duration-200 ${
                viewMode === 'back'
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
              aria-label="Human body back view"
            >
              {/* Soft Gray Back Body Silhouette */}
              <g fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2.2" strokeLinejoin="round">
                <circle cx="120" cy="40" r="23" />
                <path d="M 111 62 L 111 80 L 129 80 L 129 62 Z" />
                <path d="M 84 80 L 156 80 L 148 175 L 92 175 Z" />
                <path d="M 92 175 L 148 175 L 142 210 L 98 210 Z" />
                <path d="M 84 83 L 60 152 L 50 220 L 63 222 L 73 156 L 90 92 Z" />
                <path d="M 156 83 L 180 152 L 190 220 L 177 222 L 167 156 L 150 92 Z" />
                <path d="M 98 210 L 92 288 L 88 355 L 108 355 L 114 288 L 117 210 Z" />
                <ellipse cx="97" cy="364" rx="13" ry="7" />
                <path d="M 123 210 L 126 288 L 132 355 L 152 355 L 148 288 L 142 210 Z" />
                <ellipse cx="143" cy="364" rx="13" ry="7" />
              </g>

              {/* Subtle Spine Line */}
              <line
                x1="120"
                y1="65"
                x2="120"
                y2="188"
                stroke="#D1D5DB"
                strokeWidth="3"
                strokeDasharray="3 3"
              />

              {/* Back Head */}
              {renderZoneGlowCircle('head', 120, 40, 17)}

              {/* Cervical Spine (C1-C7 exact neck back location) */}
              {renderZoneGlowRect('neck_cervical', 111, 63, 18, 26, 5)}

              {/* Thoracic Spine (Upper/Mid Back) */}
              {renderZoneGlowRect('spine_thoracic', 111, 93, 18, 42, 5)}

              {/* Lumbar Spine (Lower Back) */}
              {renderZoneGlowRect('spine_lumbar', 110, 139, 20, 36, 5)}

              {/* Kidneys (left & right lower-mid back) */}
              <g
                onClick={() => handleTapRegion('kidney')}
                className={isHighlighted('kidney') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowCircle('kidney', 100, 146, 8.5)}
                {renderZoneGlowCircle('kidney', 140, 146, 8.5)}
              </g>

              {/* Hips / Pelvis */}
              {renderZoneGlowPath('pelvis', 'M 98 182 L 142 182 L 138 204 L 102 204 Z')}

              {/* Shoulders */}
              {renderZoneGlowCircle('shoulder_left', 82, 87, 9)}
              {renderZoneGlowCircle('shoulder_right', 158, 87, 9)}

              {/* Arms & Hands */}
              <g
                onClick={() => handleTapRegion('arms_hands')}
                className={isHighlighted('arms_hands') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowPath('arms_hands', 'M 65 142 L 73 144 L 62 218 L 52 216 Z')}
                {renderZoneGlowPath('arms_hands', 'M 175 142 L 167 144 L 178 218 L 188 216 Z')}
              </g>

              {/* Knees */}
              {renderZoneGlowCircle('knee_left', 103, 282, 10)}
              {renderZoneGlowCircle('knee_right', 137, 282, 10)}

              {/* Feet */}
              <g
                onClick={() => handleTapRegion('feet')}
                className={isHighlighted('feet') ? 'cursor-pointer' : 'pointer-events-none'}
              >
                {renderZoneGlowCircle('feet', 97, 362, 10)}
                {renderZoneGlowCircle('feet', 143, 362, 10)}
              </g>
            </svg>
          </div>

          {/* Highlighted Region Chips (Anatomical + Systemic General Areas like Blood / Bones & Muscles) */}
          {(anatomicalIds.length > 0 || systemicIds.length > 0) ? (
            <div className="w-full space-y-2.5 mt-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {orderedRegionIds.map((rId) => {
                  const summary = regions[rId];
                  const sevStyle = SEVERITY_COLORS[summary.severity];
                  const isSelected = selectedRegionId === rId;
                  return (
                    <button
                      key={rId}
                      type="button"
                      onClick={() => handleTapRegion(rId)}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition min-h-[40px] ${
                        sevStyle.softBg
                      } ${sevStyle.text} ${
                        isSelected ? 'ring-2 ring-[var(--color-brand)] ring-offset-1' : ''
                      }`}
                    >
                      {rId === 'blood_system' ? (
                        <Droplets className="w-4 h-4 shrink-0" style={{ color: sevStyle.fill }} />
                      ) : rId === 'bones_joints' ? (
                        <Bone className="w-4 h-4 shrink-0" style={{ color: sevStyle.fill }} />
                      ) : rId === 'general' ? (
                        <Activity className="w-4 h-4 shrink-0" style={{ color: sevStyle.fill }} />
                      ) : (
                        renderSeverityIcon(summary.severity)
                      )}
                      <span>{summary.areaLabel}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-xs font-medium text-[var(--color-text-secondary)]">
                {ui.tapHint}
              </p>
            </div>
          ) : (
            <p className="text-center text-sm font-medium text-[var(--color-text-secondary)] mt-2">
              {ui.noRegions}
            </p>
          )}
        </div>
      </div>

      {/* Tap Interaction Panel / Bottom Sheet on Mobile */}
      {activeRegionSummary && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/45 p-0 sm:p-4 print:hidden"
          onClick={() => setSelectedRegionId(null)}
        >
          <div
            className="rs-card w-full sm:max-w-md rounded-b-none sm:rounded-[16px] p-5 pb-7 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle on Mobile */}
            <div className="w-10 h-1 bg-[var(--color-divider)] rounded-full mx-auto sm:hidden" />

            {/* Header: Kind badge ("Related body area" vs "Affected area") + Name + Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--color-brand)]">
                  {activeRegionSummary.mappingKind === 'affected_injury'
                    ? ui.affectedArea
                    : ui.relatedArea}
                </span>
                <div className="flex items-center gap-2">
                  {renderSeverityIcon(activeRegionSummary.severity, 'w-5 h-5 shrink-0')}
                  <h4 className="text-xl font-extrabold text-[var(--color-text)] leading-tight">
                    {activeRegionSummary.areaLabel}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRegionId(null)}
                aria-label="Close"
                className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Related findings */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-[var(--color-text-secondary)]">
                {ui.relatedFindings}
              </p>
              <div className="space-y-2">
                {activeRegionSummary.findings.map((f) => {
                  const fname = f.translations?.[language]?.name || f.name;
                  return (
                    <div
                      key={f.id}
                      className="rounded-[12px] bg-[var(--color-bg)] px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[var(--color-text)] truncate">
                          {fname}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold font-mono text-[var(--color-text)]">
                            {f.value} {f.unit || ''}
                          </span>
                          {f.source_label && (
                            <span className="text-xs font-bold text-[var(--color-brand)] bg-[var(--color-brand-soft)] rounded-full px-2 py-0.5">
                              {f.source_label}
                            </span>
                          )}
                        </div>
                      </div>
                      {renderStatusBadge(f.status)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* What this means (1-2 simple lines) */}
            <div className="rounded-[12px] bg-[var(--color-brand-soft)]/50 px-4 py-3 space-y-1">
              <p className="text-sm font-bold text-[var(--color-brand)]">{ui.whatThisMeans}</p>
              <p className="text-base text-[var(--color-text)] font-medium leading-snug">
                {activeRegionSummary.shortNote}
              </p>
              {activeRegionSummary.findings[0] && (
                <p className="text-sm text-[var(--color-text-secondary)] leading-snug">
                  {activeRegionSummary.findings[0].translations?.[language]?.short_explanation ||
                    activeRegionSummary.findings[0].short_explanation}
                </p>
              )}
            </div>

            {/* View test details button */}
            {onViewFinding && activeRegionSummary.findings[0] && (
              <button
                type="button"
                onClick={() => {
                  const firstId = activeRegionSummary.findings[0].id;
                  setSelectedRegionId(null);
                  onViewFinding(firstId);
                }}
                className="rs-btn-primary w-full py-3.5 px-5 flex items-center justify-center gap-2 text-base font-extrabold"
              >
                <span>{ui.viewDetails}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {/* Calm Medical Note */}
            <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)] pt-1">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-brand)]" />
              <span>{ui.disclaimer}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
