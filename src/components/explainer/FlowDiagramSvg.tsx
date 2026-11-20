import React from 'react';
import {
  Activity,
  ArrowRight,
  Bone,
  Brain,
  CheckCircle2,
  Droplets,
  Flame,
  Gauge,
  Heart,
  KeyRound,
  Layers,
  Microscope,
  Shield,
  Sparkles,
  Sun,
  Truck,
  Utensils,
  Wind,
  Filter,
} from 'lucide-react';
import { GlossaryFlowStep } from '../../utils/glossaryLookup';
import { SupportedLanguage } from '../../utils/translations';

export interface ResolvedFlowStep {
  icon: string;
  label: string;
}

interface FlowDiagramSvgProps {
  steps: ResolvedFlowStep[];
  highlightIndex: number;
  highlightTone: 'normal' | 'caution' | 'danger';
  caption?: string;
}

function renderStepIcon(iconName: string, className: string) {
  switch (iconName) {
    case 'head':
      return <Brain className={className} />;
    case 'signal':
      return <Activity className={className} />;
    case 'throttle':
      return <Gauge className={className} />;
    case 'energy':
      return <Sparkles className={className} />;
    case 'drop':
      return <Droplets className={className} />;
    case 'food':
      return <Utensils className={className} />;
    case 'key':
      return <KeyRound className={className} />;
    case 'lungs':
      return <Wind className={className} />;
    case 'truck':
      return <Truck className={className} />;
    case 'bone':
      return <Bone className={className} />;
    case 'shield':
    case 'soldier':
      return <Shield className={className} />;
    case 'patch':
      return <Layers className={className} />;
    case 'lab':
      return <Microscope className={className} />;
    case 'muscle':
      return <Flame className={className} />;
    case 'filter':
      return <Filter className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'liver':
    case 'pipe':
      return <Activity className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'cushion':
      return <Layers className={className} />;
    case 'check':
    default:
      return <CheckCircle2 className={className} />;
  }
}

export function mapGlossaryFlowSteps(
  steps: GlossaryFlowStep[],
  language: SupportedLanguage
): ResolvedFlowStep[] {
  return steps.map((s) => ({
    icon: s.icon,
    label:
      language === 'hi'
        ? s.label_hi || s.label_en
        : language === 'or'
        ? s.label_or || s.label_en
        : s.label_en,
  }));
}

export const FlowDiagramSvg: React.FC<FlowDiagramSvgProps> = ({
  steps,
  highlightIndex,
  highlightTone,
  caption,
}) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="rounded-[14px] bg-[var(--color-bg)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-1">
        {steps.slice(0, 4).map((step, idx) => {
          const isHighlighted = idx === highlightIndex;
          const circleClass = isHighlighted
            ? highlightTone === 'danger'
              ? 'bg-[var(--color-danger-soft)] text-[var(--color-danger)] ring-2 ring-[var(--color-danger)]'
              : highlightTone === 'caution'
              ? 'bg-[var(--color-caution-soft)] text-[var(--color-text)] ring-2 ring-[var(--color-caution)]'
              : 'bg-[var(--color-normal-soft)] text-[var(--color-normal)] ring-2 ring-[var(--color-normal)]'
            : 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]';

          const iconColorClass = isHighlighted
            ? highlightTone === 'danger'
              ? 'text-[var(--color-danger)]'
              : highlightTone === 'caution'
              ? 'text-[var(--color-caution)]'
              : 'text-[var(--color-normal)]'
            : 'text-[var(--color-brand)]';

          return (
            <React.Fragment key={`${step.label}-${idx}`}>
              <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition ${circleClass}`}
                >
                  {renderStepIcon(step.icon, `w-5 h-5 ${iconColorClass}`)}
                </div>
                <span
                  className={`text-xs leading-tight break-words px-0.5 ${
                    isHighlighted
                      ? 'font-extrabold text-[var(--color-text)]'
                      : 'font-semibold text-[var(--color-text-secondary)]'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < Math.min(steps.length, 4) - 1 && (
                <div className="pt-3.5 shrink-0 text-[var(--color-text-secondary)]">
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {caption && (
        <p className="text-xs font-semibold text-[var(--color-text)] text-center leading-snug">
          {caption}
        </p>
      )}
    </div>
  );
};
