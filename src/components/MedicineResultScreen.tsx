import React, { useEffect, useState } from 'react';
import {
  MedicineAnalysis,
  MedicineReportConnection,
  MedicineSourceTag,
} from '../types/medicine';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage } from '../utils/translations';
import { medicineTranslations } from '../utils/medicineTranslations';
import { speechService } from '../utils/speech';
import {
  getHealthProfile,
  getStoredMedicines,
  getStoredReports,
  saveMedicineToStorage,
  updateMedicineInStorage,
} from '../utils/storage';
import { InfoCard } from './medicine/InfoCard';
import { WarningBanner } from './medicine/WarningBanner';
import { ConfidenceBadge } from './medicine/ConfidenceBadge';
import { MedicineTag } from './medicine/MedicineTag';
import { MedicineChatModal } from './medicine/MedicineChatModal';
import {
  ArrowLeft,
  Languages,
  Volume2,
  VolumeX,
  Loader2,
  Pill,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Hourglass,
  Check,
  X,
  Bookmark,
  FileSearch,
  Camera,
  FileText,
  HelpCircle,
  HeartHandshake,
  MessageCircleQuestion,
  Share2,
  Archive,
  Siren,
  Database,
  Baby,
  UserCheck,
  Activity,
  Phone,
} from 'lucide-react';

interface MedicineResultScreenProps {
  medicine: MedicineAnalysis;
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onMedicineUpdated?: (updated: MedicineAnalysis) => void;
  onBack: () => void;
  onRequestScanReport?: () => void;
}

export const MedicineResultScreen: React.FC<MedicineResultScreenProps> = ({
  medicine,
  currentLanguage,
  onLanguageChange,
  onMedicineUpdated,
  onBack,
  onRequestScanReport,
}) => {
  const mt = medicineTranslations[currentLanguage];
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaved, setIsSaved] = useState<boolean>(() =>
    getStoredMedicines().some((m) => m.id === medicine.id)
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Save metadata drawer
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [sourceTag, setSourceTag] = useState<MedicineSourceTag>(
    medicine.source_tag || 'not_sure'
  );
  const [doctorName, setDoctorName] = useState(medicine.doctor_name || '');
  const [durationDays, setDurationDays] = useState(medicine.duration_days || '');

  // Why was this given to me? (Medicine + Report link)
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [customProblem, setCustomProblem] = useState(medicine.user_problem || '');
  const savedReports = getStoredReports();

  // Follow-up question chat modal
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    setIsSaved(getStoredMedicines().some((m) => m.id === medicine.id));
  }, [medicine.id]);

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
        const res = await fetch('/api/translate-medicine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicineAnalysis: medicine,
            targetLanguage: currentLanguage,
          }),
        });
        const raw = await res.text();
        const data = JSON.parse(raw);
        if (!cancelled && res.ok && data.success && data.translation) {
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
  const displayWhatIsIt = tr?.what_is_it || medicine.what_is_it || mt.notVerifiedFallback;
  const displayPurpose = tr?.purpose || medicine.purpose || mt.notVerifiedFallback;
  const displayHowItWorks = tr?.how_it_works || medicine.how_it_works || mt.notVerifiedFallback;
  const displayHowToTake =
    tr?.how_to_take_as_printed || medicine.how_to_take_as_printed || mt.howToTakeDefault;
  const displayCommonSide = tr?.side_effects_common || medicine.side_effects_common || [];
  const displaySeriousSide = tr?.side_effects_see_doctor || medicine.side_effects_see_doctor || [];
  const displayTimeBetter = tr?.time_to_feel_better || medicine.time_to_feel_better || mt.notVerifiedFallback;
  const displayBeCareful = tr?.be_careful_if || medicine.be_careful_if || [];
  const displayInteractions = tr?.interactions || medicine.interactions || [];
  const displayStorage =
    tr?.storage_instructions || medicine.storage_instructions || mt.notVerifiedFallback;
  const displayDosDonts = tr?.dos_donts || medicine.dos_donts || [];
  const displayAllergyWarn =
    tr?.allergy_condition_warning || medicine.allergy_condition_warning;

  const healthProfile = getHealthProfile();
  const profileItems = [
    ...healthProfile.allergies,
    ...healthProfile.conditions,
    ...(healthProfile.is_pregnant_or_breastfeeding ? [mt.pregnantLabel] : []),
  ];

  const handleToggleSpeech = (cardId: string, text: string) => {
    if (activeSpeechId === cardId) {
      speechService.stop();
      setActiveSpeechId(null);
      return;
    }

    speechService.speak(
      text,
      currentLanguage,
      () => setActiveSpeechId(cardId),
      () => setActiveSpeechId(null),
      () => setActiveSpeechId(null)
    );
  };

  const handleReadAll = () => {
    const fullText = [
      displayBrand,
      displaySalt ? `${displaySalt}.` : '',
      medicine.medicine.is_expired ? mt.expiryExpired : '',
      `${mt.whatIsItTitle} ${displayWhatIsIt}`,
      `${mt.whatIsItFor} ${displayPurpose}`,
      `${mt.howItWorks} ${displayHowItWorks}`,
      `${mt.howToTake}: ${displayHowToTake}`,
      `${mt.timeToFeelBetter}: ${displayTimeBetter}`,
      `${mt.medicineFooter}`,
    ]
      .filter(Boolean)
      .join(' ');
    handleToggleSpeech('read-all', fullText);
  };

  const handleSaveMedicine = () => {
    const updated: MedicineAnalysis = {
      ...medicine,
      source_tag: sourceTag,
      doctor_name: doctorName.trim() || undefined,
      duration_days: durationDays.trim() || undefined,
    };

    if (isSaved) {
      updateMedicineInStorage(updated);
    } else {
      saveMedicineToStorage(updated);
      setIsSaved(true);
    }
    onMedicineUpdated?.(updated);
    setShowSaveOptions(false);
    setToastMsg(mt.savedMedicineSuccess);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleShare = async () => {
    const summaryText = `${displayBrand}${displaySalt ? ` (${displaySalt})` : ''}\n${mt.whatIsItFor}: ${displayPurpose}\n${mt.howToTake}: ${displayHowToTake}\n\n${mt.medicineFooter}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayBrand,
          text: summaryText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summaryText);
        setToastMsg(mt.copiedToast);
        setTimeout(() => setToastMsg(null), 2500);
      }
    } catch {
      // User cancelled share dialog cleanly
    }
  };

  const handleConnectReport = async (report: ReportAnalysis | null) => {
    setIsLinking(true);
    setLinkError(null);
    try {
      const res = await fetch('/api/medicine-report-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine,
          report,
          userProblem: customProblem || medicine.user_problem || '',
          language: currentLanguage,
        }),
      });
      const raw = await res.text();
      const data = JSON.parse(raw);
      if (!res.ok || !data.success || !data.connection) {
        throw new Error(data?.error || 'Could not connect right now.');
      }

      const connection: MedicineReportConnection = data.connection;
      const updated: MedicineAnalysis = {
        ...medicine,
        linked_report_id: report?.id || medicine.linked_report_id,
        user_problem: customProblem || medicine.user_problem,
        connection_summary: connection,
      };
      if (isSaved) {
        updateMedicineInStorage(updated);
      }
      onMedicineUpdated?.(updated);
      setShowReportPicker(false);
    } catch (err: unknown) {
      setLinkError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const fs = medicine.field_sources || {};
  const isVerifiedDb = medicine.verification_status !== 'not_verified';

  const getCarefulIcon = (itemText: string) => {
    const lower = itemText.toLowerCase();
    if (lower.includes('pregnan') || lower.includes('breast') || lower.includes('child')) {
      return Baby;
    }
    if (lower.includes('old') || lower.includes('elder')) {
      return UserCheck;
    }
    return Activity;
  };

  return (
    <div className="max-w-xl mx-auto px-4 pb-16 pt-4 space-y-3.5">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            speechService.stop();
            onBack();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            title={mt.shareBtn}
            className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-700" />
          </button>

          {/* Translate Toggle */}
          <button
            type="button"
            onClick={() => {
              const next: SupportedLanguage =
                currentLanguage === 'en' ? 'hi' : currentLanguage === 'hi' ? 'or' : 'en';
              onLanguageChange(next);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition active:scale-95"
          >
            {isTranslating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
            ) : (
              <Languages className="w-3.5 h-3.5 text-teal-700" />
            )}
            <span>
              {currentLanguage === 'en'
                ? 'Translate'
                : currentLanguage === 'hi'
                ? 'हिन्दी'
                : 'ଓଡ଼ିଆ'}
            </span>
          </button>

          {/* Global Read Aloud */}
          {speechService.isAvailable() && (
            <button
              type="button"
              onClick={handleReadAll}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-xs transition active:scale-95 ${
                activeSpeechId === 'read-all'
                  ? 'bg-rose-600 text-white'
                  : 'bg-teal-700 text-white hover:bg-teal-800'
              }`}
            >
              {activeSpeechId === 'read-all' ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read aloud</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* DEMO BADGE */}
      {medicine.is_demo && (
        <div className="rounded-2xl bg-indigo-700 text-white px-4 py-2 text-xs font-black text-center tracking-wide shadow-xs">
          {mt.demoBadge}
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="rounded-2xl bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. EXPIRY BANNER */}
      {medicine.medicine.is_expired ? (
        <div className="space-y-2">
          <WarningBanner
            variant="emergency"
            icon={AlertOctagon}
            title={mt.expiryExpired}
            body={
              medicine.medicine.expiry_reliable !== false && medicine.medicine.expiry
                ? `Expiry: ${medicine.medicine.expiry}`
                : undefined
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:108"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-700 text-white py-2 px-3 text-xs font-black shadow-xs hover:bg-rose-800 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>
                {currentLanguage === 'hi'
                  ? '108 एम्बुलेंस'
                  : currentLanguage === 'or'
                  ? '108 ଆମ୍ବୁଲାନ୍ସ'
                  : 'Call 108 Ambulance'}
              </span>
            </a>
            <a
              href="tel:104"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white text-rose-800 border border-rose-300 py-2 px-3 text-xs font-black shadow-xs hover:bg-rose-50 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>
                {currentLanguage === 'hi'
                  ? '104 हेल्पलाइन'
                  : currentLanguage === 'or'
                  ? '104 ହେଲ୍ପଲାଇନ୍'
                  : 'Call 104 Helpline'}
              </span>
            </a>
          </div>
        </div>
      ) : medicine.medicine.expiry && medicine.medicine.expiry_reliable !== false ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 px-4 py-2.5 flex items-center justify-between text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold">{mt.expiryOk}</span>
          </div>
          <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
            Exp: {medicine.medicine.expiry}
          </span>
        </div>
      ) : (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-2.5 flex items-center gap-2 text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="text-xs font-bold">{mt.expiryUnknown}</span>
        </div>
      )}

      {/* 2. TOP MEDICINE CARD (Photo + Brand + Generic Salt + Confidence + Verification Status) */}
      <div className="rounded-3xl bg-white p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-start gap-3.5">
          {medicine.pack_thumbnail ? (
            <img
              src={medicine.pack_thumbnail}
              alt={displayBrand}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Pill className="w-7 h-7" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight break-words">
              {displayBrand}
            </h1>
            {(displaySalt || medicine.medicine.strength) && (
              <p className="text-xs sm:text-sm font-bold text-teal-800 mt-1">
                {displaySalt || ''}
                {displaySalt && medicine.medicine.strength ? ' • ' : ''}
                {medicine.medicine.strength || ''}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <ConfidenceBadge confidence={medicine.confidence} language={currentLanguage} />
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  isVerifiedDb
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <Database className="w-3 h-3" />
                <span>{isVerifiedDb ? mt.sourceVerified : mt.sourceNotVerified}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Printed pack metadata */}
        {(medicine.medicine.manufacturer || medicine.medicine.batch || medicine.medicine.mrp) && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
            {medicine.medicine.manufacturer && (
              <div className="bg-slate-50 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400 block font-semibold">Maker (Pack)</span>
                <span className="font-bold text-slate-800 truncate block">
                  {medicine.medicine.manufacturer}
                </span>
              </div>
            )}
            {medicine.medicine.batch && (
              <div className="bg-slate-50 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400 block font-semibold">Batch (Pack)</span>
                <span className="font-mono font-bold text-slate-800">
                  {medicine.medicine.batch}
                </span>
              </div>
            )}
            {medicine.medicine.mrp && (
              <div className="bg-slate-50 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400 block font-semibold">MRP (Pack)</span>
                <span className="font-bold text-slate-800">{medicine.medicine.mrp}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UNVERIFIED DATABASE NOTICE */}
      {!isVerifiedDb && (
        <WarningBanner
          variant="caution"
          icon={AlertTriangle}
          title={mt.couldNotVerifyTitle}
        />
      )}

      {/* 3. WHO CAN GIVE IT TAG */}
      <MedicineTag
        accessLevel={medicine.medicine.access_level}
        language={currentLanguage}
      />

      {/* 4. SAFETY WARNINGS: ALLERGY / RISKY CLASS / SUSPICIOUS PACK / EMERGENCY */}
      {displayAllergyWarn && (
        <WarningBanner
          variant="danger"
          icon={ShieldAlert}
          title="Allergy / Health Caution"
          body={displayAllergyWarn}
        />
      )}

      {!displayAllergyWarn && profileItems.length > 0 && (
        <div className="rounded-2xl bg-slate-100 border border-slate-200 px-3.5 py-2.5 text-[11px] font-medium text-slate-600 flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            Checked against your profile ({profileItems.join(', ')}). Confirm with a pharmacist.
          </span>
        </div>
      )}

      {medicine.risk_flags && medicine.risk_flags.length > 0 && (
        <WarningBanner
          variant="warning"
          icon={AlertTriangle}
          title={mt.riskyMedicineTitle}
          body={mt.riskyMedicineBody}
        />
      )}

      {medicine.suspicious_flags && medicine.suspicious_flags.length > 0 && (
        <WarningBanner
          variant="caution"
          icon={AlertTriangle}
          title={mt.suspiciousPackTitle}
          body={mt.suspiciousPackBody}
        />
      )}

      {/* 5. WHAT IS IT? / WHY IS IT USED? / HOW DOES IT WORK? (Separate Cards + Per-Card Read Aloud) */}
      <InfoCard
        cardId="what-is-it"
        title={mt.whatIsItTitle}
        icon={Pill}
        source={fs.what_is_it}
        language={currentLanguage}
        readAloudText={`${mt.whatIsItTitle} ${displayWhatIsIt}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        <p className="text-sm font-bold text-slate-900 leading-snug">{displayWhatIsIt}</p>
      </InfoCard>

      <InfoCard
        cardId="why-used"
        title={mt.whatIsItFor}
        icon={Stethoscope}
        source={fs.why_used}
        language={currentLanguage}
        readAloudText={`${mt.whatIsItFor} ${displayPurpose}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        <p className="text-sm font-semibold text-slate-900 leading-snug">{displayPurpose}</p>
      </InfoCard>

      <InfoCard
        cardId="how-it-works"
        title={mt.howItWorks}
        icon={Sparkles}
        source={fs.how_it_works}
        language={currentLanguage}
        readAloudText={`${mt.howItWorks} ${displayHowItWorks}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        <p className="text-sm font-semibold text-slate-900 leading-snug">{displayHowItWorks}</p>
      </InfoCard>

      {/* 6. HOW TO TAKE IT */}
      <InfoCard
        cardId="how-to-take"
        title={mt.howToTake}
        icon={Clock}
        iconColorClass="text-teal-900"
        bgClass="bg-teal-50/80 border-teal-200"
        source={fs.how_to_take}
        language={currentLanguage}
        readAloudText={`${mt.howToTake}. ${displayHowToTake}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        <p className="text-sm font-bold text-slate-900 leading-snug">{displayHowToTake}</p>
      </InfoCard>

      {/* 7. TIME TO FEEL BETTER */}
      <InfoCard
        cardId="time-better"
        title={mt.timeToFeelBetter}
        icon={Hourglass}
        iconColorClass="text-indigo-800"
        source={fs.time_to_feel_better}
        language={currentLanguage}
        readAloudText={`${mt.timeToFeelBetter}. ${displayTimeBetter}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        <p className="text-sm font-semibold text-slate-800 leading-snug">{displayTimeBetter}</p>
      </InfoCard>

      {/* 8. SIDE EFFECTS (2 GROUPS) */}
      <InfoCard
        cardId="side-effects"
        title={mt.sideEffectsTitle}
        icon={AlertTriangle}
        iconColorClass="text-slate-800"
        source={fs.side_effects}
        language={currentLanguage}
        readAloudText={`${mt.sideEffectsTitle}. ${mt.sideEffectsCommon}: ${displayCommonSide.join(', ')}. ${mt.sideEffectsSeeDoctor}: ${displaySeriousSide.join(', ')}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        {displayCommonSide.length === 0 && displaySeriousSide.length === 0 ? (
          <p className="text-xs font-bold text-amber-800">{mt.notVerifiedFallback}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
              <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{mt.sideEffectsCommon}</span>
              </h4>
              <ul className="space-y-1.5">
                {displayCommonSide.map((item, idx) => (
                  <li key={idx} className="text-xs font-semibold text-slate-700 flex items-start gap-1.5">
                    <span className="text-slate-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3">
              <h4 className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5 mb-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{mt.sideEffectsSeeDoctor}</span>
              </h4>
              <ul className="space-y-1.5">
                {displaySeriousSide.map((item, idx) => (
                  <li key={idx} className="text-xs font-bold text-rose-900 flex items-start gap-1.5">
                    <span className="text-rose-500">!</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </InfoCard>

      {/* 9. WHO SHOULD BE CAREFUL */}
      <InfoCard
        cardId="be-careful"
        title={mt.beCarefulIf}
        icon={AlertTriangle}
        iconColorClass="text-amber-900"
        bgClass="bg-amber-50/60 border-amber-200"
        source={fs.be_careful_if}
        language={currentLanguage}
        readAloudText={`${mt.beCarefulIf}: ${displayBeCareful.join(', ')}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        {displayBeCareful.length === 0 ? (
          <p className="text-xs font-bold text-amber-800">{mt.notVerifiedFallback}</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-1">
            {displayBeCareful.map((item, idx) => {
              const CareIcon = getCarefulIcon(item);
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950"
                >
                  <CareIcon className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{item}</span>
                </span>
              );
            })}
          </div>
        )}
      </InfoCard>

      {/* 10. INTERACTIONS (Medicines, Food, Alcohol) */}
      <InfoCard
        cardId="interactions"
        title={mt.interactionsTitle}
        icon={ShieldAlert}
        iconColorClass="text-rose-800"
        source={fs.interactions}
        language={currentLanguage}
        readAloudText={`${mt.interactionsTitle}: ${displayInteractions.join(', ')}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        {displayInteractions.length === 0 ? (
          <p className="text-xs font-bold text-amber-800">{mt.notVerifiedFallback}</p>
        ) : (
          <ul className="space-y-1.5">
            {displayInteractions.map((line, idx) => (
              <li key={idx} className="text-xs font-bold text-slate-800 flex items-start gap-1.5">
                <span className="text-rose-500">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </InfoCard>

      {/* 11. STORAGE */}
      <InfoCard
        cardId="storage"
        title={mt.storageTitle}
        icon={Archive}
        iconColorClass="text-slate-700"
        source={fs.storage}
        language={currentLanguage}
        readAloudText={`${mt.storageTitle}: ${displayStorage}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        <p className="text-xs sm:text-sm font-semibold text-slate-800">{displayStorage}</p>
      </InfoCard>

      {/* 12. DO'S AND DON'TS */}
      <InfoCard
        cardId="dos-donts"
        title={mt.dosDonts}
        icon={CheckCircle2}
        iconColorClass="text-teal-800"
        source={fs.dos_donts}
        language={currentLanguage}
        readAloudText={`${mt.dosDonts}: ${displayDosDonts.join(', ')}`}
        activeSpeechId={activeSpeechId}
        onSpeechToggle={handleToggleSpeech}
      >
        {displayDosDonts.length === 0 ? (
          <p className="text-xs font-bold text-amber-800">{mt.notVerifiedFallback}</p>
        ) : (
          <ul className="space-y-2 mt-1">
            {displayDosDonts.map((line, idx) => {
              const isDont =
                line.toLowerCase().startsWith('do not') ||
                line.toLowerCase().startsWith("don't") ||
                line.includes('न ') ||
                line.includes('ନାହିଁ');
              return (
                <li key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-800">
                  {isDont ? (
                    <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>
        )}
      </InfoCard>

      {/* 13. EMERGENCY BANNER */}
      <WarningBanner
        variant="emergency"
        icon={Siren}
        title={mt.emergencyBanner}
      />

      {/* 14. FOLLOW-UP QUESTION CHAT & WHY GIVEN ACTION ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setShowChatModal(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-teal-700 py-3.5 px-4 text-xs font-extrabold text-white shadow-sm hover:bg-teal-800 transition active:scale-98"
        >
          <MessageCircleQuestion className="w-4 h-4" />
          <span>{mt.askQuestionBtn}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowReportPicker((prev) => !prev)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-700 py-3.5 px-4 text-xs font-extrabold text-white shadow-sm hover:bg-indigo-800 transition active:scale-98"
        >
          <FileSearch className="w-4 h-4" />
          <span>{mt.whyGivenBtn}</span>
        </button>
      </div>

      {/* WHY WAS THIS GIVEN TO ME? PANEL & RESULT */}
      {(medicine.connection_summary || showReportPicker) && (
        <div className="rounded-3xl bg-indigo-50/80 border border-indigo-200 p-4 space-y-3">
          {medicine.connection_summary && (
            <div className="rounded-2xl bg-white border border-indigo-200 p-4 space-y-3">
              {medicine.connection_summary.conflict_detected && (
                <div className="rounded-xl bg-amber-50 border border-amber-300 p-2.5 text-xs font-bold text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Your report and problem look different. Please ask your doctor to confirm.
                  </span>
                </div>
              )}

              <div>
                <h4 className="text-xs font-black uppercase text-indigo-900">{mt.whyGivenTitle}</h4>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {medicine.connection_summary.why_given}
                </p>
              </div>

              {medicine.connection_summary.what_to_do_now?.length > 0 && (
                <div>
                  <h5 className="text-xs font-extrabold text-slate-700">{mt.whatToDoNow}</h5>
                  <ul className="mt-1 space-y-1">
                    {medicine.connection_summary.what_to_do_now.map((s, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-700 flex gap-1.5">
                        <span className="text-indigo-600">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {medicine.connection_summary.ask_doctor?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <h5 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{mt.askYourDoctor}</span>
                  </h5>
                  <ul className="mt-1 space-y-1">
                    {medicine.connection_summary.ask_doctor.map((q, i) => (
                      <li key={i} className="text-xs font-semibold text-slate-700">
                        • {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {showReportPicker && (
            <div className="rounded-2xl bg-white border border-indigo-200 p-4 space-y-3">
              <h4 className="text-xs font-black text-slate-900">{mt.pickReportTitle}</h4>

              <input
                type="text"
                value={customProblem}
                onChange={(e) => setCustomProblem(e.target.value)}
                placeholder={mt.problemPlaceholder}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />

              {linkError && (
                <p className="text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-xl">
                  {linkError}
                </p>
              )}

              {isLinking ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-indigo-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking connection...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedReports.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-500">{mt.pickFromSaved}:</p>
                      {savedReports.slice(0, 5).map((rep) => (
                        <button
                          key={rep.id}
                          type="button"
                          onClick={() => handleConnectReport(rep)}
                          className="w-full text-left rounded-xl border border-slate-200 p-2.5 hover:border-indigo-500 hover:bg-indigo-50/40 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">
                              {rep.report_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                            {new Date(rep.created_at).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {onRequestScanReport && (
                    <button
                      type="button"
                      onClick={onRequestScanReport}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal-300 bg-teal-50 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{mt.scanNewReportOpt}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleConnectReport(null)}
                    className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    {mt.useProblemOnly}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 15. SAVE TO MY MEDICINES */}
      <div className="rounded-3xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
        <button
          type="button"
          onClick={() => setShowSaveOptions((prev) => !prev)}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 px-4 text-xs sm:text-sm font-extrabold transition ${
            isSaved
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>{isSaved ? mt.savedMedicineSuccess : mt.saveMedicineBtn}</span>
        </button>

        {showSaveOptions && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'doctor_prescribed', label: mt.tagDoctor },
                  { id: 'bought_myself', label: mt.tagSelf },
                  { id: 'not_sure', label: mt.tagNotSure },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSourceTag(opt.id)}
                  className={`rounded-xl px-2 py-2 text-[11px] font-bold border transition ${
                    sourceTag === opt.id
                      ? 'bg-teal-50 border-teal-600 text-teal-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder={mt.doctorNameLabel}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <input
                type="text"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder={mt.daysLabel}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveMedicine}
              className="w-full rounded-xl bg-teal-700 py-2.5 text-xs font-extrabold text-white hover:bg-teal-800"
            >
              Confirm Save
            </button>
          </div>
        )}
      </div>

      {/* 16. MEDICINE FOOTERS */}
      <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 text-center space-y-1">
        <p className="text-xs font-black text-slate-800">{mt.medicineFooter}</p>
        <p className="text-[11px] font-semibold text-slate-600">{mt.appNotReplaceDoctor}</p>
      </div>

      {/* Follow-up Question Chat Modal */}
      {showChatModal && (
        <MedicineChatModal
          medicine={medicine}
          language={currentLanguage}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  );
};
