import React, { useEffect, useMemo, useState } from 'react';
import {
  MedicineAnalysis,
  MedicineReportConnection,
} from '../types/medicine';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage, translations } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { speechService } from '../utils/speech';
import { resolveMedicineVisual } from '../utils/medicineVisualMapper';
import {
  detectSameSaltPairs,
  getStoredMedicines,
  getStoredReports,
  saveMedicineToStorage,
  updateMedicineInStorage,
} from '../utils/storage';
import { MedicineChatModal } from './medicine/MedicineChatModal';
import { MedicineVisualBadge } from './medicine/MedicineVisual';
import { BodyMap } from './BodyMap';
import { getClientDeviceId } from '../utils/uploadJob';
import {
  computeTranslationCacheKey,
  getCachedTranslation,
  setCachedTranslation,
} from '../utils/cache';
import {
  ArrowLeft,
  Languages,
  Volume2,
  VolumeX,
  Loader2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Check,
  CheckCircle2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Phone,
  Share2,
  MessageCircleQuestion,
  X,
} from 'lucide-react';

interface MedicineResultScreenProps {
  medicine: MedicineAnalysis;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onMedicineUpdated?: (updated: MedicineAnalysis) => void;
  onBack: () => void;
  onRequestScanReport?: () => void;
}

type MoreRowId =
  | 'how_works'
  | 'how_take'
  | 'side_effects'
  | 'time_better'
  | 'be_careful'
  | 'interactions'
  | 'storage'
  | 'dos_donts'
  | 'why_given';

export const MedicineResultScreen: React.FC<MedicineResultScreenProps> = ({
  medicine,
  currentLanguage,
  onLanguageChange,
  onMedicineUpdated,
  onBack,
  onRequestScanReport,
}) => {
  const mt = medicineTranslations[currentLanguage];
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaved, setIsSaved] = useState<boolean>(() =>
    getStoredMedicines().some((m) => m.id === medicine.id)
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Collapsible "More details" state (hidden by default, 1 row open at a time)
  const [showMore, setShowMore] = useState(false);
  const [openRow, setOpenRow] = useState<MoreRowId | null>(null);

  // Optional problem chips inside More
  const [selectedProblem, setSelectedProblem] = useState<string>(medicine.user_problem || '');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBodyMapModal, setShowBodyMapModal] = useState(false);

  const visual = useMemo(
    () => resolveMedicineVisual(medicine, currentLanguage),
    [medicine, currentLanguage]
  );

  const savedReports = getStoredReports();
  const savedMedicines = getStoredMedicines();

  // Check same-salt conflict against saved medicines
  const sameSaltConflict = detectSameSaltPairs([
    medicine,
    ...savedMedicines.filter((m) => m.id !== medicine.id),
  ]).find((pair) => pair.medA.id === medicine.id || pair.medB.id === medicine.id);

  useEffect(() => {
    setIsSaved(getStoredMedicines().some((m) => m.id === medicine.id));
    setSelectedProblem(medicine.user_problem || '');
  }, [medicine.id, medicine.user_problem]);

  useEffect(() => {
    return () => {
      speechService.stop();
    };
  }, []);

  // On-demand translation when switching language
  useEffect(() => {
    let cancelled = false;

    const needsTranslation = () => {
      if (medicine.translations?.[currentLanguage]?.purpose) return false;
      const baseIsHi = medicine.translations?.hi?.purpose === medicine.purpose;
      const baseIsOr = medicine.translations?.or?.purpose === medicine.purpose;
      if (currentLanguage === 'en' && !baseIsHi && !baseIsOr) return false;
      return true;
    };

    const translateNow = async () => {
      if (!needsTranslation()) return;
      setIsTranslating(true);
      try {
        const cacheKey = await computeTranslationCacheKey(
          'medicine',
          {
            brand: medicine.medicine.brand,
            salt: medicine.medicine.salt,
            purpose: medicine.purpose,
            how_it_works: medicine.how_it_works,
            how_to_take_as_printed: medicine.how_to_take_as_printed,
          },
          currentLanguage
        );
        const cached = getCachedTranslation<any>(cacheKey);
        if (cached) {
          if (!cancelled) {
            const updated: MedicineAnalysis = {
              ...medicine,
              translations: {
                ...medicine.translations,
                [currentLanguage]: cached,
              },
            };
            updateMedicineInStorage(updated);
            onMedicineUpdated?.(updated);
          }
          return;
        }

        const res = await fetch('/api/translate-medicine', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Id': getClientDeviceId(),
          },
          body: JSON.stringify({
            medicineAnalysis: medicine,
            targetLanguage: currentLanguage,
          }),
        });
        const raw = await res.text();
        const data = JSON.parse(raw);
        if (!cancelled && res.ok && data.success && data.translation) {
          setCachedTranslation(cacheKey, data.translation);
          const updated: MedicineAnalysis = {
            ...medicine,
            translations: {
              ...medicine.translations,
              [currentLanguage]: data.translation,
            },
          };
          updateMedicineInStorage(updated);
          onMedicineUpdated?.(updated);
        }
      } catch (err) {
        console.warn('On-demand medicine translation failed:', err);
      } finally {
        if (!cancelled) setIsTranslating(false);
      }
    };

    translateNow();
    return () => {
      cancelled = true;
    };
  }, [currentLanguage, medicine, onMedicineUpdated]);

  const tr = medicine.translations?.[currentLanguage];
  const displayBrand = tr?.brand || medicine.medicine.brand;
  const displaySalt = tr?.salt || medicine.medicine.salt;
  const displayPurpose = tr?.purpose || medicine.purpose || mt.notVerifiedFallback;
  const displayHowItWorks = tr?.how_it_works || medicine.how_it_works || mt.notVerifiedFallback;
  const displayHowToTake =
    tr?.how_to_take_as_printed || medicine.how_to_take_as_printed || mt.howToTakeDefault;
  const displayCommonSide = tr?.side_effects_common || medicine.side_effects_common || [];
  const displaySeriousSide = tr?.side_effects_see_doctor || medicine.side_effects_see_doctor || [];
  const displayTimeBetter =
    tr?.time_to_feel_better || medicine.time_to_feel_better || mt.notVerifiedFallback;
  const displayBeCareful = tr?.be_careful_if || medicine.be_careful_if || [];
  const displayInteractions = tr?.interactions || medicine.interactions || [];
  const displayStorage =
    tr?.storage_instructions || medicine.storage_instructions || mt.notVerifiedFallback;
  const displayDosDonts = tr?.dos_donts || medicine.dos_donts || [];
  const displayAllergyWarn = tr?.allergy_condition_warning || medicine.allergy_condition_warning;

  const topWarningSign = displaySeriousSide[0] || mt.notVerifiedFallback;

  const accessTag =
    medicine.medicine.access_level === 'otc'
      ? {
          icon: <CheckCircle2 className="w-5 h-5 text-[var(--color-normal)] shrink-0" />,
          box: 'bg-[var(--color-normal-soft)] text-[var(--color-text)]',
          label:
            currentLanguage === 'hi'
              ? 'दुकान से खरीदें'
              : currentLanguage === 'or'
              ? 'ଦୋକାନରୁ କିଣନ୍ତୁ'
              : 'Buy at shop',
        }
      : medicine.medicine.access_level === 'prescription_only'
      ? {
          icon: <AlertOctagon className="w-5 h-5 text-[var(--color-danger)] shrink-0" />,
          box: 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
          label:
            currentLanguage === 'hi'
              ? 'सिर्फ डॉक्टर की पर्ची से'
              : currentLanguage === 'or'
              ? 'କେବଳ ଡାକ୍ତରୀ ଚିଠା'
              : "Doctor's prescription only",
        }
      : {
          icon: <AlertTriangle className="w-5 h-5 text-[var(--color-caution)] shrink-0" />,
          box: 'bg-[var(--color-caution-soft)] text-[var(--color-text)]',
          label: mt.accessAskDoctor,
        };

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }

    const fullText = [
      displayBrand,
      medicine.medicine.strength || '',
      medicine.medicine.is_expired ? mt.expiryExpired : '',
      accessTag.label,
      visual.fullUsedForLine,
      displayPurpose,
      topWarningSign,
      mt.medicineFooter,
    ]
      .filter(Boolean)
      .join('. ');

    speechService.speak(
      fullText,
      currentLanguage,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleQuickSave = () => {
    if (!isSaved) {
      saveMedicineToStorage(medicine);
      setIsSaved(true);
    } else {
      updateMedicineInStorage(medicine);
    }
    setToastMsg(mt.savedMedicineSuccess);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleShare = async () => {
    const shareSignOff = translations[currentLanguage].shareSignOff;
    const summaryText = `${displayBrand}${displaySalt ? ` (${displaySalt})` : ''}\n${mt.whatIsItFor}: ${displayPurpose}\n${mt.howToTake}: ${displayHowToTake}\n\n${mt.medicineFooter}\n\n— ${shareSignOff}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayBrand,
          text: summaryText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
        setToastMsg(mt.copiedToast);
        setTimeout(() => setToastMsg(null), 2000);
      }
    } catch {
      // User cancelled share cleanly
    }
  };

  const handleCycleLanguage = () => {
    const next: SupportedLanguage =
      currentLanguage === 'en' ? 'hi' : currentLanguage === 'hi' ? 'or' : 'en';
    onLanguageChange(next);
  };

  const handleSelectProblemChip = (chipLabel: string) => {
    const nextProblem = selectedProblem === chipLabel ? '' : chipLabel;
    setSelectedProblem(nextProblem);
    const updated: MedicineAnalysis = {
      ...medicine,
      user_problem: nextProblem || undefined,
    };
    if (isSaved) {
      updateMedicineInStorage(updated);
    }
    onMedicineUpdated?.(updated);
  };

  const handleConnectReport = async (report: ReportAnalysis | null) => {
    setIsLinking(true);
    setLinkError(null);
    try {
      const res = await fetch('/api/medicine-report-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getClientDeviceId(),
        },
        body: JSON.stringify({
          medicine,
          report,
          userProblem: selectedProblem || medicine.user_problem || '',
          language: currentLanguage,
        }),
      });
      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
      if (!res.ok || !data?.success || !data?.connection) {
        throw new Error(data?.error || 'Could not check right now. Please try again.');
      }

      const connection: MedicineReportConnection = data.connection;
      const updated: MedicineAnalysis = {
        ...medicine,
        linked_report_id: report?.id || medicine.linked_report_id,
        user_problem: selectedProblem || medicine.user_problem,
        connection_summary: connection,
      };
      if (isSaved) {
        updateMedicineInStorage(updated);
      }
      onMedicineUpdated?.(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const safeMsg =
        msg && !msg.includes('fetch') && !msg.includes('JSON') && msg.length < 140
          ? msg
          : 'Could not check right now. Please try again.';
      setLinkError(safeMsg);
    } finally {
      setIsLinking(false);
    }
  };

  const toggleAccordion = (id: MoreRowId) => {
    setOpenRow((prev) => (prev === id ? null : id));
  };

  const problemChips = [
    mt.chipFever,
    mt.chipPain,
    mt.chipCold,
    mt.chipSugar,
    mt.chipBp,
    mt.chipInfection,
    mt.chipStomach,
    mt.chipOther,
  ];

  const hasTopBanners =
    medicine.is_demo ||
    medicine.medicine.is_expired ||
    Boolean(sameSaltConflict) ||
    Boolean(displayAllergyWarn) ||
    (medicine.risk_flags && medicine.risk_flags.length > 0) ||
    (medicine.suspicious_flags && medicine.suspicious_flags.length > 0);

  return (
    <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-6">
      {/* Top Bar: Back + Small Translate Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            speechService.stop();
            onBack();
          }}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleCycleLanguage}
          className="rs-card inline-flex items-center gap-2 px-4 py-2.5 text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] transition"
        >
          {isTranslating ? (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand)]" />
          ) : (
            <Languages className="w-4 h-4 text-[var(--color-brand)]" />
          )}
          <span>
            {currentLanguage === 'en'
              ? 'Translate'
              : currentLanguage === 'hi'
              ? 'हिन्दी'
              : 'ଓଡ଼ିଆ'}
          </span>
        </button>
      </div>

      {/* Toast (brand teal, not health normal green) */}
      {toastMsg && (
        <div className="rounded-[16px] bg-[var(--color-brand)] text-white px-4 py-3 text-base font-bold flex items-center justify-center gap-2 shadow-[var(--shadow-card)]">
          <Check className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP DANGER BANNERS (Only shown when triggered) */}
      {hasTopBanners && (
        <div className="space-y-3">
          {medicine.is_demo && (
            <div className="rounded-[16px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] px-4 py-2.5 text-base font-extrabold text-center">
              {mt.demoBadge}
            </div>
          )}

          {medicine.medicine.is_expired && (
            <div className="rounded-[16px] bg-[var(--color-danger)] text-white p-5 shadow-[var(--shadow-card)] space-y-3">
              <div className="flex items-center gap-3">
                <AlertOctagon className="w-6 h-6 shrink-0" />
                <span className="text-lg font-extrabold">{mt.expiryExpired}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:108"
                  className="flex items-center justify-center gap-2 rounded-[12px] bg-white text-[var(--color-danger)] py-2.5 text-base font-extrabold"
                >
                  <Phone className="w-4 h-4" />
                  <span>108</span>
                </a>
                <a
                  href="tel:104"
                  className="flex items-center justify-center gap-2 rounded-[12px] bg-black/20 text-white py-2.5 text-base font-extrabold"
                >
                  <Phone className="w-4 h-4" />
                  <span>104</span>
                </a>
              </div>
            </div>
          )}

          {sameSaltConflict && (
            <div className="rounded-[16px] bg-[var(--color-danger)] text-white px-5 py-4 shadow-[var(--shadow-card)] flex items-center gap-3 text-base font-extrabold">
              <AlertOctagon className="w-6 h-6 shrink-0" />
              <span>
                Same salt as{' '}
                {sameSaltConflict.medA.id === medicine.id
                  ? sameSaltConflict.medB.medicine.brand
                  : sameSaltConflict.medA.medicine.brand}{' '}
                ({sameSaltConflict.sharedSalt})
              </span>
            </div>
          )}

          {displayAllergyWarn && (
            <div className="rounded-[16px] bg-[var(--color-danger-soft)] text-[var(--color-danger)] px-5 py-4 shadow-[var(--shadow-card)] flex items-center gap-3 text-base font-bold">
              <ShieldAlert className="w-6 h-6 text-[var(--color-danger)] shrink-0" />
              <span>{displayAllergyWarn}</span>
            </div>
          )}

          {medicine.risk_flags && medicine.risk_flags.length > 0 && (
            <div className="rounded-[16px] bg-[var(--color-caution-soft)] text-[var(--color-text)] px-5 py-4 shadow-[var(--shadow-card)] flex items-center gap-3 text-base font-bold">
              <AlertTriangle className="w-6 h-6 text-[var(--color-caution)] shrink-0" />
              <span>{mt.riskyMedicineTitle}</span>
            </div>
          )}

          {medicine.suspicious_flags && medicine.suspicious_flags.length > 0 && (
            <div className="rounded-[16px] bg-[var(--color-caution-soft)] text-[var(--color-text)] px-5 py-4 shadow-[var(--shadow-card)] flex items-center gap-3 text-base font-bold">
              <AlertTriangle className="w-6 h-6 text-[var(--color-caution)] shrink-0" />
              <span>{mt.suspiciousPackTitle}</span>
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEW (ONLY THESE 4 VISIBLE) */}
      <div className="rs-card p-6 space-y-5">
        {/* 1. Medicine name (big 20px+) + strength + small pack photo if captured */}
        <div className="flex items-center gap-4">
          {medicine.pack_thumbnail && (
            <img
              src={medicine.pack_thumbnail}
              alt={displayBrand}
              className="w-16 h-16 rounded-[14px] object-cover border border-[var(--color-divider)] shrink-0"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-[var(--color-text)] leading-tight break-words">
              {displayBrand}
            </h1>
            {medicine.medicine.strength && (
              <p className="text-base font-bold text-[var(--color-brand)] mt-0.5">
                {medicine.medicine.strength}
              </p>
            )}
          </div>
        </div>

        {/* 2. One colored status tag paired with icon and label */}
        <div className={`rounded-[14px] px-4 py-3 flex items-center gap-3 ${accessTag.box}`}>
          {accessTag.icon}
          <span className="text-base font-extrabold">{accessTag.label}</span>
        </div>

        {/* 3. Used for: small static visual + 1 short line + "Commonly used for" */}
        <div className="space-y-2">
          <div className="flex items-center gap-3.5">
            <MedicineVisualBadge
              visual={visual}
              onTapExpand={visual.bodyRegion ? () => setShowBodyMapModal(true) : undefined}
              tapAriaLabel={visual.fullUsedForLine}
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                {currentLanguage === 'hi'
                  ? 'किस काम की है'
                  : currentLanguage === 'or'
                  ? 'କଣ ପାଇଁ ବ୍ୟବହାର ହୁଏ'
                  : 'Used for'}
              </span>
              <p className="text-lg font-bold text-[var(--color-text)] leading-snug line-clamp-1">
                {displayPurpose}
              </p>
              <p className="text-sm font-semibold text-[var(--color-brand)] leading-snug">
                {visual.fullUsedForLine}
              </p>
            </div>
          </div>
          {visual.relatedAreaNote && (
            <p className="text-xs font-medium text-[var(--color-text-secondary)] leading-snug">
              {visual.relatedAreaNote}
            </p>
          )}
        </div>

        {/* 4. Go to doctor if: 1 short line */}
        <div className="space-y-1">
          <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-danger)] block">
            {currentLanguage === 'hi'
              ? 'डॉक्टर के पास जाएं अगर'
              : currentLanguage === 'or'
              ? 'ଡାକ୍ତରଙ୍କ ପାଖକୁ ଯାଆନ୍ତୁ ଯଦି'
              : 'Go to doctor if'}
          </span>
          <p className="text-lg font-bold text-[var(--color-text)] leading-snug line-clamp-1">
            {topWarningSign}
          </p>
        </div>
      </div>

      {/* TWO ROUND BUTTONS (Read Aloud & Save) + MORE DETAILS BUTTON */}
      <div className="space-y-5">
        <div className="flex items-center justify-center gap-12">
          {speechService.isAvailable() && (
            <button
              type="button"
              onClick={handleToggleReadAloud}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-card)] transition ${
                  isSpeaking
                    ? 'bg-[var(--color-text)] text-white'
                    : 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
              </span>
              <span className="text-base font-bold text-[var(--color-text)]">
                {isSpeaking ? 'Stop' : 'Read aloud'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickSave}
            className="flex flex-col items-center gap-2"
          >
            <span
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-card)] transition ${
                isSaved
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              {isSaved ? <Check className="w-7 h-7" /> : <Bookmark className="w-7 h-7" />}
            </span>
            <span className="text-base font-bold text-[var(--color-text)]">
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="rs-card w-full py-4 px-5 text-base font-extrabold text-[var(--color-text)] flex items-center justify-center gap-2 hover:bg-[var(--color-surface-subtle)] transition"
        >
          <span>
            {currentLanguage === 'hi'
              ? 'और जानकारी'
              : currentLanguage === 'or'
              ? 'ଅଧିକ ସୂଚନା'
              : 'More details'}
          </span>
          {showMore ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* MORE DETAILS (Hidden by default, collapsed 1-line rows, only 1 open at a time) */}
      {showMore && (
        <div className="rs-card divide-y divide-[var(--color-divider)] overflow-hidden">
          {/* Interactive related body area visual trigger inside More details */}
          {visual.bodyRegion && (
            <button
              type="button"
              onClick={() => setShowBodyMapModal(true)}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--color-bg)] transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MedicineVisualBadge visual={visual} />
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--color-text)] truncate">
                    {visual.shortLabel}
                  </p>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {currentLanguage === 'hi'
                      ? 'बड़ा शरीर मानचित्र देखने के लिए टैप करें'
                      : currentLanguage === 'or'
                      ? 'ବଡ଼ ଶରୀର ମାନଚିତ୍ର ଦେଖିବାକୁ ଟ୍ୟାପ୍ କରନ୍ତୁ'
                      : 'Tap visual to view larger body map'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
            </button>
          )}

          {/* How it works */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('how_works')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.howItWorks}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'how_works' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'how_works' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)]">
                {displayHowItWorks}
              </div>
            )}
          </div>

          {/* How to take it */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('how_take')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.howToTake}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'how_take' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'how_take' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)]">
                {displayHowToTake}
              </div>
            )}
          </div>

          {/* Side effects */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('side_effects')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.sideEffectsTitle}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'side_effects' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'side_effects' && (
              <div className="px-5 pb-4 text-base text-[var(--color-text)] space-y-2">
                {displayCommonSide.length === 0 && displaySeriousSide.length === 0 ? (
                  <p>{mt.notVerifiedFallback}</p>
                ) : (
                  <>
                    {displayCommonSide.map((s, i) => (
                      <p key={`c-${i}`} className="font-medium">• {s}</p>
                    ))}
                    {displaySeriousSide.map((s, i) => (
                      <p key={`s-${i}`} className="font-bold text-[var(--color-danger)]">! {s}</p>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Time to feel better */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('time_better')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.timeToFeelBetter}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'time_better' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'time_better' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)]">
                {displayTimeBetter}
              </div>
            )}
          </div>

          {/* Be careful if */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('be_careful')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.beCarefulIf}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'be_careful' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'be_careful' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)] space-y-1.5">
                {displayBeCareful.length === 0 ? (
                  <p>{mt.notVerifiedFallback}</p>
                ) : (
                  displayBeCareful.map((item, i) => <p key={i}>• {item}</p>)
                )}
              </div>
            )}
          </div>

          {/* Interactions */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('interactions')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.interactionsTitle}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'interactions' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'interactions' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)] space-y-1.5">
                {displayInteractions.length === 0 ? (
                  <p>{mt.notVerifiedFallback}</p>
                ) : (
                  displayInteractions.map((item, i) => <p key={i}>• {item}</p>)
                )}
              </div>
            )}
          </div>

          {/* Storage */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('storage')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.storageTitle}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'storage' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'storage' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)]">
                {displayStorage}
              </div>
            )}
          </div>

          {/* Do's and Don'ts */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('dos_donts')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.dosDonts}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'dos_donts' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'dos_donts' && (
              <div className="px-5 pb-4 text-base font-medium text-[var(--color-text)] space-y-1.5">
                {displayDosDonts.length === 0 ? (
                  <p>{mt.notVerifiedFallback}</p>
                ) : (
                  displayDosDonts.map((item, i) => <p key={i}>• {item}</p>)
                )}
              </div>
            )}
          </div>

          {/* Why was this given to me? */}
          <div>
            <button
              type="button"
              onClick={() => toggleAccordion('why_given')}
              className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)]"
            >
              <span className="truncate">{mt.whyGivenBtn}</span>
              <ChevronDown
                className={`w-5 h-5 text-[var(--color-text-secondary)] shrink-0 transition ${
                  openRow === 'why_given' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openRow === 'why_given' && (
              <div className="px-5 pb-4 space-y-3 text-base text-[var(--color-text)]">
                {medicine.connection_summary && (
                  <p className="font-bold text-[var(--color-text)]">
                    {medicine.connection_summary.why_given}
                  </p>
                )}

                {linkError && <p className="text-[var(--color-danger)] font-bold">{linkError}</p>}

                {isLinking ? (
                  <div className="flex items-center gap-2 text-[var(--color-brand)] font-bold">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Checking...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedReports.slice(0, 3).map((rep) => (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => handleConnectReport(rep)}
                        className="w-full text-left rounded-[12px] bg-[var(--color-bg)] px-4 py-3 font-bold text-[var(--color-text)] hover:bg-[var(--color-brand-soft)] truncate transition"
                      >
                        {rep.report_type}
                      </button>
                    ))}
                    {onRequestScanReport && (
                      <button
                        type="button"
                        onClick={onRequestScanReport}
                        className="w-full rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] py-3 font-bold"
                      >
                        {mt.scanNewReportOpt}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleConnectReport(null)}
                      className="w-full rounded-[12px] bg-[var(--color-surface-subtle)] text-[var(--color-text)] py-3 font-bold"
                    >
                      {mt.useProblemOnly}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ask a question */}
          <button
            type="button"
            onClick={() => setShowChatModal(true)}
            className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
          >
            <span className="flex items-center gap-2.5">
              <MessageCircleQuestion className="w-5 h-5 text-[var(--color-brand)]" />
              <span>{mt.askQuestionBtn}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
          >
            <span className="flex items-center gap-2.5">
              <Share2 className="w-5 h-5 text-[var(--color-brand)]" />
              <span>{mt.shareBtn}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          {/* Translate */}
          <button
            type="button"
            onClick={handleCycleLanguage}
            className="w-full px-5 py-4 flex items-center justify-between text-left text-base font-bold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition"
          >
            <span className="flex items-center gap-2.5">
              <Languages className="w-5 h-5 text-[var(--color-brand)]" />
              <span>
                {currentLanguage === 'en'
                  ? 'Translate'
                  : currentLanguage === 'hi'
                  ? 'भाषा बदलें (हिन्दी)'
                  : 'ଭାଷା ବଦଳାନ୍ତୁ (ଓଡ଼ିଆ)'}
              </span>
            </span>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          {/* Optional "Add your problem" small chip row at bottom of More */}
          <div className="px-5 py-4 space-y-3 bg-[var(--color-bg)]/60">
            <span className="text-base font-bold text-[var(--color-text-secondary)] block">
              {currentLanguage === 'hi'
                ? 'अपनी परेशानी जोड़ें'
                : currentLanguage === 'or'
                ? 'ଆପଣଙ୍କ ସମସ୍ୟା ଯୋଡ଼ନ୍ତୁ'
                : 'Add your problem'}
            </span>
            <div className="flex flex-wrap gap-2">
              {problemChips.map((chip) => {
                const active = selectedProblem === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSelectProblemChip(chip)}
                    className={`rounded-full px-4 py-2 text-base font-bold transition ${
                      active
                        ? 'bg-[var(--color-brand)] text-white'
                        : 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]'
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subtle Footer */}
      <p className="text-center text-sm font-medium text-[var(--color-text-secondary)] pt-2">
        {mt.medicineFooter}
      </p>

      {/* Follow-up Question Chat Modal */}
      {showChatModal && (
        <MedicineChatModal
          medicine={medicine}
          language={currentLanguage}
          onClose={() => setShowChatModal(false)}
        />
      )}

      {/* Larger Body Map Modal when user taps the highlighted medicine visual */}
      {showBodyMapModal && visual.bodyRegion && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/50 p-0 sm:p-4"
          onClick={() => setShowBodyMapModal(false)}
        >
          <div
            className="rs-card w-full sm:max-w-lg rounded-b-none sm:rounded-[16px] p-4 sm:p-5 max-h-[90vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--color-brand)] truncate">
                  {displayBrand}
                </p>
                <p className="text-base font-extrabold text-[var(--color-text)]">
                  {visual.fullUsedForLine}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBodyMapModal(false)}
                aria-label="Close body map"
                className="w-10 h-10 rounded-full bg-[var(--color-surface-subtle)] flex items-center justify-center text-[var(--color-text-secondary)] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <BodyMap
              affectedRegions={[visual.bodyRegion]}
              findings={[]}
              overallSeverity="green"
              language={currentLanguage}
              medicineContext={{
                regionId: visual.bodyRegion,
                medicineName: displayBrand,
                commonlyUsedFor: visual.fullUsedForLine,
                disclaimerNote:
                  visual.relatedAreaNote ||
                  'Shows a related area. It does not confirm your condition.',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
