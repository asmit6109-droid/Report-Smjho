import React from 'react';
import {
  Thermometer,
  Bug,
  Sun,
  Flame,
  HeartPulse,
  Droplet,
  Flower2,
  Wind,
  Bone,
  Hand,
  Activity,
  Pill,
} from 'lucide-react';
import { BodyRegionId } from '../../types/report';
import {
  MedicineCategoryIconId,
  ResolvedMedicineVisual,
} from '../../utils/medicineVisualMapper';

interface CategoryIconProps {
  iconId: MedicineCategoryIconId;
  className?: string;
}

export const MedicineCategoryLineIcon: React.FC<CategoryIconProps> = ({
  iconId,
  className = 'w-6 h-6',
}) => {
  switch (iconId) {
    case 'pain_fever':
      return <Thermometer className={className} strokeWidth={2} />;
    case 'infection':
      return <Bug className={className} strokeWidth={2} />;
    case 'vitamin_supplement':
      return <Sun className={className} strokeWidth={2} />;
    case 'stomach_acidity':
      return <Flame className={className} strokeWidth={2} />;
    case 'blood_pressure':
      return <HeartPulse className={className} strokeWidth={2} />;
    case 'blood_sugar':
      return <Droplet className={className} strokeWidth={2} />;
    case 'allergy_cold':
      return <Flower2 className={className} strokeWidth={2} />;
    case 'lungs_breathing':
      return <Wind className={className} strokeWidth={2} />;
    case 'bones_joints':
      return <Bone className={className} strokeWidth={2} />;
    case 'skin':
      return <Hand className={className} strokeWidth={2} />;
    case 'general':
      return <Activity className={className} strokeWidth={2} />;
    case 'neutral':
    default:
      return <Pill className={className} strokeWidth={2} />;
  }
};

interface MiniBodyRegionSvgProps {
  regionId: BodyRegionId;
  className?: string;
  bwPrint?: boolean;
}

/**
 * Lightweight inline 2D front-body SVG with a single calm teal highlight
 * (or dark slate in B&W print mode). Contains zero text inside the SVG.
 */
export const MiniBodyRegionSvg: React.FC<MiniBodyRegionSvgProps> = ({
  regionId,
  className = 'w-11 h-14',
  bwPrint = false,
}) => {
  const highlightColor = bwPrint ? '#111827' : '#0F766E';
  const outlineStroke = bwPrint ? '#6B7280' : '#9CA3AF';
  const bodyFill = bwPrint ? '#F3F4F6' : '#E5E7EB';

  return (
    <svg
      viewBox="0 0 240 385"
      className={`${className} select-none shrink-0`}
      aria-hidden="true"
    >
      {/* Simple Front Body Outline matching main BodyMap proportions */}
      <g fill={bodyFill} stroke={outlineStroke} strokeWidth="6" strokeLinejoin="round">
        <circle cx="120" cy="40" r="23" />
        <path d="M 111 62 L 111 80 L 129 80 L 129 62 Z" />
        <path d="M 84 80 L 156 80 L 148 175 L 92 175 Z" />
        <path d="M 92 175 L 148 175 L 142 210 L 98 210 Z" />
        <path d="M 84 83 L 60 152 L 50 220 L 63 222 L 73 156 L 90 92 Z" />
        <path d="M 156 83 L 180 152 L 190 220 L 177 222 L 167 156 L 150 92 Z" />
        <path d="M 98 210 L 92 288 L 88 355 L 108 355 L 114 288 L 117 210 Z" />
        <path d="M 123 210 L 126 288 L 132 355 L 152 355 L 148 288 L 142 210 Z" />
      </g>

      {/* Single Highlighted Related Area */}
      {regionId === 'thyroid' && (
        <g>
          <circle cx="120" cy="70" r="18" fill={highlightColor} fillOpacity="0.22" />
          <path
            d="M 109 67 C 109 62 117 63 120 68 C 123 63 131 62 131 67 C 131 75 124 77 120 74 C 116 77 109 75 109 67 Z"
            fill={highlightColor}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </g>
      )}

      {regionId === 'chest_lungs' && (
        <g>
          <circle cx="120" cy="108" r="34" fill={highlightColor} fillOpacity="0.18" />
          <path
            d="M 95 92 Q 108 86 116 95 L 116 124 Q 102 126 95 120 Z"
            fill={highlightColor}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          <path
            d="M 145 92 Q 132 86 124 95 L 124 124 Q 138 126 145 120 Z"
            fill={highlightColor}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </g>
      )}

      {regionId === 'heart' && (
        <g>
          <circle cx="127" cy="108" r="20" fill={highlightColor} fillOpacity="0.22" />
          <circle
            cx="127"
            cy="108"
            r="12"
            fill={highlightColor}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </g>
      )}

      {regionId === 'stomach_intestines' && (
        <g>
          <circle cx="122" cy="150" r="28" fill={highlightColor} fillOpacity="0.18" />
          <path
            d="M 122 134 Q 142 132 143 149 Q 142 167 120 168 Q 98 167 99 152 L 122 150 Z"
            fill={highlightColor}
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </g>
      )}

      {regionId === 'head' && (
        <circle
          cx="120"
          cy="36"
          r="17"
          fill={highlightColor}
          stroke="#FFFFFF"
          strokeWidth="3"
        />
      )}

      {regionId === 'abdomen_liver' && (
        <path
          d="M 95 130 L 126 130 Q 124 146 97 148 Z"
          fill={highlightColor}
          stroke="#FFFFFF"
          strokeWidth="3"
        />
      )}

      {regionId === 'urinary_system' && (
        <circle
          cx="120"
          cy="182"
          r="11"
          fill={highlightColor}
          stroke="#FFFFFF"
          strokeWidth="3"
        />
      )}
    </svg>
  );
};

interface MedicineVisualBadgeProps {
  visual: ResolvedMedicineVisual;
  onTapExpand?: () => void;
  bwPrint?: boolean;
  tapAriaLabel?: string;
}

/**
 * Compact static vector badge shown next to "Used for" on MedicineResultScreen
 * and inside PrintReportSheet.
 */
export const MedicineVisualBadge: React.FC<MedicineVisualBadgeProps> = ({
  visual,
  onTapExpand,
  bwPrint = false,
  tapAriaLabel,
}) => {
  const canOpenBodyMap = Boolean(visual.bodyRegion && onTapExpand);

  const inner = visual.preferMiniBodyOnCard && visual.bodyRegion ? (
    <MiniBodyRegionSvg
      regionId={visual.bodyRegion}
      className={bwPrint ? 'w-9 h-12' : 'w-11 h-14'}
      bwPrint={bwPrint}
    />
  ) : (
    <MedicineCategoryLineIcon
      iconId={visual.iconId}
      className={bwPrint ? 'w-6 h-6 text-gray-800' : 'w-7 h-7 text-[var(--color-brand)]'}
    />
  );

  const baseClass = bwPrint
    ? 'w-12 h-14 rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center shrink-0'
    : `w-14 h-16 rounded-[12px] flex items-center justify-center shrink-0 ${
        visual.mode === 'neutral'
          ? 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]'
          : 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
      }`;

  if (canOpenBodyMap && !bwPrint) {
    return (
      <button
        type="button"
        onClick={onTapExpand}
        aria-label={tapAriaLabel || visual.shortLabel}
        title={tapAriaLabel || visual.shortLabel}
        className={`${baseClass} hover:ring-2 hover:ring-[var(--color-brand)]/40 transition cursor-pointer`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={baseClass} aria-hidden="true">
      {inner}
    </div>
  );
};
