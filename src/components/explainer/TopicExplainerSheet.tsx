import React, { useEffect, useMemo, useState } from 'react';
import { BodyRegionId, Finding } from '../../types/report';
import { SupportedLanguage } from '../../utils/translations';
import {
  findGlossaryEntryForFinding,
  findGlossaryEntryForRegion,
  getGlossaryContentForLanguage,
  GlossaryEntry,
} from '../../utils/glossaryLookup';
import { getRegionLabel, RegionSeverity } from '../../utils/bodyMapper';
import { computeFindingGauge } from '../../utils/referenceRanges';
import {
  buildExplanationCacheKey,
  CachedTopicExplanation,
  getCachedPersonalLine,
  getCachedTopicExplanation,
  setCachedPersonalLine,
  setCachedTopicExplanation,
} from '../../utils/cache';
import {
  ClarityVote,
  getTopicFeedback,
  saveTopicFeedback,
} from '../../utils/feedbackStorage';
import { getClientDeviceId } from '../../utils/uploadJob';
import { speechService } from '../../utils/speech';
import { AnalogyIcon } from './AnalogyIcon';
import { FlowDiagramSvg, mapGlossaryFlowSteps } from './FlowDiagramSvg';
import {
  X,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  ShieldCheck,
  Stethoscope,
  Activity,
  HelpCircle,
} from 'lucide-react';

export type ExplainerTarget =
  | {
      kind: 'finding';
      finding: Finding;
    }
  | {
      kind: 'region';
      regionId: BodyRegionId;
      areaLabel?: string;
      findings: Finding[];
      severity: RegionSeverity;
      shortNote?: string;
    };

interface TopicExplainerSheetProps {
  target: ExplainerTarget;
  language: SupportedLanguage;
  onClose: () => void;
}

function getSheetCopy(lang: SupportedLanguage) {
  if (lang === 'hi') {
    return {
      whatIsThis: 'यह क्या है?',
      whatMeasures: 'यह क्या जांचता है',
      whatYourResult: 'आपके नतीजे का मतलब',
      whatYouMayFeel: 'आपको क्या महसूस हो सकता है',
      askDoctor: 'डॉक्टर से पूछें',
      listen: 'सुनें',
      stopListen: 'रोकें',
      wasThisClear: 'क्या यह साफ समझ आया?',
      thanksFeedback: 'आपकी राय सेव हो गई।',
      safetyLine: 'यह आपकी रिपोर्ट समझने में मदद के लिए है। यह कोई बीमारी तय नहीं करता।',
      uncertainFallback: 'मैं इस हिस्से के बारे में पक्का नहीं कह सकता, कृपया डॉक्टर से पूछें।',
      loadingLine: 'आपके मान के हिसाब से सरल जानकारी तैयार हो रही है...',
    };
  }
  if (lang === 'or') {
    return {
      whatIsThis: 'ଏହା କଣ?',
      whatMeasures: 'ଏହା କଣ ମାପେ',
      whatYourResult: 'ଆପଣଙ୍କ ଫଳାଫଳର ଅର୍ଥ',
      whatYouMayFeel: 'ଆପଣଙ୍କୁ କଣ ଅନୁଭବ ହୋଇପାରେ',
      askDoctor: 'ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ',
      listen: 'ଶୁଣନ୍ତୁ',
      stopListen: 'ବନ୍ଦ କରନ୍ତୁ',
      wasThisClear: 'ଏହା କଣ ସହଜରେ ବୁଝାପଡ଼ିଲା?',
      thanksFeedback: 'ଆପଣଙ୍କ ମତାମତ ସେଭ୍ ହୋଇଗଲା।',
      safetyLine: 'ଏହା ଆପଣଙ୍କ ରିପୋର୍ଟ ବୁଝିବାରେ ସାହାଯ୍ୟ କରେ। ଏହା କୌଣସି ରୋଗ ନିର୍ଣ୍ଣୟ ନୁହେଁ।',
      uncertainFallback: 'ମୁଁ ଏହି ଅଂଶ ବିଷୟରେ ନିଶ୍ଚିତ ନୁହେଁ, ଦୟାକରି ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ।',
      loadingLine: 'ଆପଣଙ୍କ ମାନ ଅନୁସାରେ ସରଳ ସୂଚନା ପ୍ରସ୍ତୁତ ହେଉଛି...',
    };
  }
  return {
    whatIsThis: 'What is this?',
    whatMeasures: 'What it checks',
    whatYourResult: 'What YOUR result means',
    whatYouMayFeel: 'What you may feel',
    askDoctor: 'Question to ask your doctor',
    listen: 'Listen',
    stopListen: 'Stop',
    wasThisClear: 'Was this clear?',
    thanksFeedback: 'Thanks for telling us.',
    safetyLine: 'This helps you understand your report. It is not a diagnosis.',
    uncertainFallback: "I'm not sure about this part, please ask a doctor.",
    loadingLine: 'Preparing a calm note for your number...',
  };
}

function buildOfflinePersonalLine(
  target: ExplainerTarget,
  language: SupportedLanguage
): string {
  if (target.kind === 'region') {
    const first = target.findings[0];
    if (target.shortNote) return target.shortNote;
    if (first) {
      return (
        first.translations?.[language]?.short_explanation ||
        first.short_explanation
      );
    }
    return language === 'hi'
      ? 'यह क्षेत्र आपकी रिपोर्ट में जांचा गया है।'
      : language === 'or'
      ? 'ଆପଣଙ୍କ ରିପୋର୍ଟରେ ଏହି ଅଂଶ ଯାଞ୍ଚ ହୋଇଛି।'
      : 'This area was noted in your report.';
  }

  const f = target.finding;
  const gauge = computeFindingGauge(f, language);
  const existingNote = f.translations?.[language]?.short_explanation || f.short_explanation;
  if (existingNote) {
    return `${gauge.summaryLine} ${existingNote}`.trim();
  }
  return gauge.summaryLine;
}

export const TopicExplainerSheet: React.FC<TopicExplainerSheetProps> = ({
  target,
  language,
  onClose,
}) => {
  const copy = getSheetCopy(language);

  const primaryFinding: Finding | null =
    target.kind === 'finding' ? target.finding : target.findings[0] || null;

  const glossaryEntry: GlossaryEntry | null = useMemo(() => {
    if (target.kind === 'finding') {
      return findGlossaryEntryForFinding(target.finding);
    }
    return findGlossaryEntryForRegion(target.regionId);
  }, [target]);

  const topicId = useMemo(() => {
    if (glossaryEntry) return glossaryEntry.id;
    if (target.kind === 'finding') {
      return (
        target.finding.translations?.en?.name ||
        target.finding.name ||
        target.finding.id
      )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_');
    }
    return target.regionId;
  }, [glossaryEntry, target]);

  const topicTitle = useMemo(() => {
    if (glossaryEntry) {
      return getGlossaryContentForLanguage(glossaryEntry, language).title;
    }
    if (target.kind === 'finding') {
      return target.finding.translations?.[language]?.name || target.finding.name;
    }
    return target.areaLabel || getRegionLabel(target.regionId, language);
  }, [glossaryEntry, target, language]);

  const highlightTone: 'normal' | 'caution' | 'danger' = useMemo(() => {
    if (target.kind === 'region') return target.severity;
    if (target.finding.status === 'critical') return 'danger';
    if (target.finding.status === 'low' || target.finding.status === 'high') {
      return 'caution';
    }
    return 'normal';
  }, [target]);

  const statusKey: 'low' | 'high' | 'critical' | 'normal' =
    primaryFinding?.status || (highlightTone === 'danger' ? 'critical' : highlightTone === 'caution' ? 'high' : 'normal');

  const valueKey = primaryFinding ? `${primaryFinding.value}_${primaryFinding.status}` : statusKey;

  const [personalLine, setPersonalLine] = useState<string>(() =>
    buildOfflinePersonalLine(target, language)
  );
  const [aiFullContent, setAiFullContent] = useState<CachedTopicExplanation | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [vote, setVote] = useState<ClarityVote | null>(() => getTopicFeedback(topicId));

  useEffect(() => {
    setVote(getTopicFeedback(topicId));
  }, [topicId]);

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // Load cached/AI explanation:
  // - If glossary entry exists -> fetch/cache only personalized "yourResultMeans" line when online
  // - If missing from glossary -> fetch/cache full explanation cleanly (with calm uncertainty fallback if offline/unsure)
  useEffect(() => {
    let cancelled = false;

    const loadExplanation = async () => {
      if (glossaryEntry) {
        const fallbackLine = buildOfflinePersonalLine(target, language);
        setPersonalLine(fallbackLine);

        const cachedLine = getCachedPersonalLine(topicId, language, valueKey);
        if (cachedLine) {
          setPersonalLine(cachedLine);
          return;
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return;
        }

        setIsLoadingAi(true);
        try {
          const res = await fetch('/api/explain-topic', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Device-Id': getClientDeviceId(),
            },
            body: JSON.stringify({
              mode: 'personal_line',
              topicId,
              topicName: topicTitle,
              value: primaryFinding ? `${primaryFinding.value} ${primaryFinding.unit || ''}`.trim() : '',
              referenceRange: primaryFinding?.reference_range || '',
              status: statusKey,
              language,
            }),
          });
          const data = await res.json();
          if (!cancelled && res.ok && data?.success && data.personalLine) {
            setPersonalLine(data.personalLine);
            setCachedPersonalLine(topicId, language, valueKey, data.personalLine);
          }
        } catch {
          // Keep clean offline fallback line
        } finally {
          if (!cancelled) setIsLoadingAi(false);
        }
        return;
      }

      // Topic not in built-in glossary -> check cached full explanation first
      const cacheKey = buildExplanationCacheKey(topicId, language);
      const cachedFull = getCachedTopicExplanation(cacheKey);
      if (cachedFull) {
        setAiFullContent(cachedFull);
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setAiFullContent({
          title: topicTitle,
          analogy: copy.uncertainFallback,
          whatItMeasures: buildOfflinePersonalLine(target, language),
          yourResultMeans: buildOfflinePersonalLine(target, language),
          feelings: [],
          doctorQuestion:
            language === 'hi'
              ? 'कृपया मुझे इस जांच का मतलब आसान शब्दों में बताएं।'
              : language === 'or'
              ? 'ଦୟାକରି ମୋତେ ଏହି ପରୀକ୍ଷାର ଅର୍ଥ ସହଜରେ ବୁଝାନ୍ତୁ।'
              : 'Could you explain what this finding means for me?',
          isUncertain: true,
        });
        return;
      }

      setIsLoadingAi(true);
      try {
        const res = await fetch('/api/explain-topic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getClientDeviceId(),
          },
          body: JSON.stringify({
            mode: 'full',
            topicId,
            topicName: topicTitle,
            value: primaryFinding ? `${primaryFinding.value} ${primaryFinding.unit || ''}`.trim() : '',
            referenceRange: primaryFinding?.reference_range || '',
            status: statusKey,
            shortExplanation: primaryFinding?.short_explanation || '',
            language,
          }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && data?.success && data.explanation) {
          setAiFullContent(data.explanation);
          setCachedTopicExplanation(cacheKey, data.explanation);
        } else if (!cancelled) {
          setAiFullContent({
            title: topicTitle,
            analogy: copy.uncertainFallback,
            whatItMeasures: buildOfflinePersonalLine(target, language),
            yourResultMeans: buildOfflinePersonalLine(target, language),
            feelings: [],
            doctorQuestion: 'Could you explain this result during my visit?',
            isUncertain: true,
          });
        }
      } catch {
        if (!cancelled) {
          setAiFullContent({
            title: topicTitle,
            analogy: copy.uncertainFallback,
            whatItMeasures: buildOfflinePersonalLine(target, language),
            yourResultMeans: buildOfflinePersonalLine(target, language),
            feelings: [],
            doctorQuestion: 'Could you explain this result during my visit?',
            isUncertain: true,
          });
        }
      } finally {
        if (!cancelled) setIsLoadingAi(false);
      }
    };

    loadExplanation();
    return () => {
      cancelled = true;
    };
  }, [
    glossaryEntry,
    topicId,
    topicTitle,
    language,
    valueKey,
    statusKey,
    primaryFinding,
    target,
    copy.uncertainFallback,
  ]);

  // Compose final display data strictly in required 6-section order
  const glossaryContent = glossaryEntry
    ? getGlossaryContentForLanguage(glossaryEntry, language)
    : null;

  const displayTitle = glossaryContent?.title || aiFullContent?.title || topicTitle;
  const displayAnalogy = glossaryContent?.analogy || aiFullContent?.analogy || copy.uncertainFallback;
  const displayMeasures =
    glossaryContent?.whatItMeasures ||
    aiFullContent?.whatItMeasures ||
    buildOfflinePersonalLine(target, language);
  const displayYourResult = glossaryContent
    ? personalLine
    : aiFullContent?.yourResultMeans || buildOfflinePersonalLine(target, language);

  const displayFeelings: string[] = useMemo(() => {
    if (glossaryContent) {
      const f = glossaryContent.feelings;
      const picked =
        statusKey === 'low'
          ? f.low
          : statusKey === 'high' || statusKey === 'critical'
          ? f.high
          : f.normal;
      return (picked && picked.length > 0 ? picked : f.general || []).slice(0, 4);
    }
    return (aiFullContent?.feelings || []).slice(0, 4);
  }, [glossaryContent, aiFullContent, statusKey]);

  const displayDoctorQuestion =
    glossaryContent?.doctorQuestion ||
    aiFullContent?.doctorQuestion ||
    (language === 'hi'
      ? 'क्या इस जांच के लिए आगे कोई ध्यान रखने की जरूरत है?'
      : language === 'or'
      ? 'ଏହି ପରୀକ୍ଷା ପାଇଁ ଆଉ କିଛି ଧ୍ୟାନ ଦେବା ଦରକାର କି?'
      : 'What should I keep in mind about this result?');

  const resolvedFlow = useMemo(() => {
    if (glossaryEntry?.flowDiagram) {
      const fd = glossaryEntry.flowDiagram;
      const steps = mapGlossaryFlowSteps(fd.steps, language);
      const hiIdx =
        fd.highlightIndexByStatus[statusKey] ??
        fd.highlightIndexByStatus[statusKey === 'critical' ? 'high' : 'normal'] ??
        -1;
      const captionKey =
        statusKey === 'critical' ? 'high' : statusKey === 'low' ? 'low' : statusKey === 'high' ? 'high' : 'normal';
      const captionObj = fd.captionByStatus[captionKey] || fd.captionByStatus.high || fd.captionByStatus.normal;
      const caption = captionObj ? captionObj[language] || captionObj.en : '';
      return { steps, highlightIndex: hiIdx, caption };
    }
    if (aiFullContent?.flowSteps && aiFullContent.flowSteps.length > 0) {
      return {
        steps: aiFullContent.flowSteps,
        highlightIndex: aiFullContent.flowHighlightIndex ?? -1,
        caption: aiFullContent.flowCaption || '',
      };
    }
    return null;
  }, [glossaryEntry, aiFullContent, language, statusKey]);

  const handleToggleListen = () => {
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }

    const parts = [
      displayTitle,
      displayAnalogy,
      `${copy.whatMeasures}: ${displayMeasures}`,
      `${copy.whatYourResult}: ${displayYourResult}`,
      displayFeelings.length > 0 ? `${copy.whatYouMayFeel}: ${displayFeelings.join(', ')}` : '',
      `${copy.askDoctor}: ${displayDoctorQuestion}`,
      copy.safetyLine,
    ].filter(Boolean);

    speechService.speak(
      parts.join('. '),
      language,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleVote = (nextVote: ClarityVote) => {
    setVote(nextVote);
    saveTopicFeedback(topicId, displayTitle, nextVote);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/50 p-0 sm:p-4 print:hidden"
      onClick={() => {
        speechService.stop();
        onClose();
      }}
    >
      <div
        className="rs-card w-full sm:max-w-lg rounded-b-none sm:rounded-[16px] p-5 pb-7 sm:p-6 space-y-5 max-h-[88vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="w-10 h-1 bg-[var(--color-divider)] rounded-full mx-auto sm:hidden" />

        {/* Sheet Header + Listen Button + Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-brand)] block">
              {copy.whatIsThis}
            </span>
            <h3 className="text-xl font-extrabold text-[var(--color-text)] leading-tight">
              {displayTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {speechService.isAvailable() && (
              <button
                type="button"
                onClick={handleToggleListen}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-extrabold transition ${
                  isSpeaking
                    ? 'bg-[var(--color-text)] text-white'
                    : 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]'
                }`}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                <span>{isSpeaking ? copy.stopListen : copy.listen}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                speechService.stop();
                onClose();
              }}
              aria-label="Close"
              className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Simple analogy + small SVG line-art visual */}
        <div className="rounded-[14px] bg-[var(--color-brand-soft)]/55 p-4 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-[12px] bg-[var(--color-surface)] flex items-center justify-center shrink-0 shadow-[var(--shadow-card)]">
            <AnalogyIcon name={glossaryEntry?.analogyIcon} className="w-10 h-10" />
          </div>
          <p className="text-base font-semibold text-[var(--color-text)] leading-snug">
            {displayAnalogy}
          </p>
        </div>

        {/* 2. Simple 3-4 step SVG Flow Diagram */}
        {resolvedFlow && (
          <FlowDiagramSvg
            steps={resolvedFlow.steps}
            highlightIndex={resolvedFlow.highlightIndex}
            highlightTone={highlightTone}
            caption={resolvedFlow.caption}
          />
        )}

        {/* 3. What this test/organ measures (1 line) */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-secondary)]">
            <Activity className="w-3.5 h-3.5 text-[var(--color-brand)]" />
            <span>{copy.whatMeasures}</span>
          </div>
          <p className="text-base font-medium text-[var(--color-text)] leading-snug">
            {displayMeasures}
          </p>
        </div>

        {/* 4. What YOUR result means (1 line using user's value) */}
        <div
          className={`rounded-[14px] p-4 space-y-1 ${
            highlightTone === 'danger'
              ? 'bg-[var(--color-danger-soft)]'
              : highlightTone === 'caution'
              ? 'bg-[var(--color-caution-soft)]'
              : 'bg-[var(--color-normal-soft)]'
          }`}
        >
          <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-secondary)] block">
            {copy.whatYourResult}
          </span>
          {isLoadingAi && !personalLine ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand)]" />
              <span>{copy.loadingLine}</span>
            </div>
          ) : (
            <p className="text-base font-bold text-[var(--color-text)] leading-snug">
              {displayYourResult}
            </p>
          )}
        </div>

        {/* 5. What you may feel (3-4 short items) */}
        {displayFeelings.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-secondary)] block">
              {copy.whatYouMayFeel}
            </span>
            <ul className="space-y-1.5 text-base font-medium text-[var(--color-text)]">
              {displayFeelings.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 leading-snug">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 6. One question to ask your doctor */}
        <div className="rounded-[14px] bg-[var(--color-bg)] p-4 flex items-start gap-3">
          <Stethoscope className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-secondary)] block">
              {copy.askDoctor}
            </span>
            <p className="text-base font-bold text-[var(--color-text)] leading-snug">
              {displayDoctorQuestion}
            </p>
          </div>
        </div>

        {/* Subtle Clarity Feedback ("Was this clear?" thumbs up/down) */}
        <div className="pt-2 border-t border-[var(--color-divider)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-secondary)]">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>{vote ? copy.thanksFeedback : copy.wasThisClear}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVote('up')}
              aria-label="Yes, clear"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                vote === 'up'
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleVote('down')}
              aria-label="No, unclear"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                vote === 'down'
                  ? 'bg-[var(--color-text)] text-white'
                  : 'bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calm safety note */}
        <div className="flex items-start gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--color-brand)] shrink-0 mt-0.5" />
          <span>{copy.safetyLine}</span>
        </div>
      </div>
    </div>
  );
};
