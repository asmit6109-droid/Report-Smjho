import React, { useEffect, useRef, useState } from 'react';
import { ReportAnalysis } from '../types/report';
import { SupportedLanguage } from '../utils/translations';
import { getClientDeviceId } from '../utils/uploadJob';
import { speechService } from '../utils/speech';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  MessageCircleQuestion,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ReportQuestionBoxProps {
  report: ReportAnalysis;
  language: SupportedLanguage;
}

interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function getUiCopy(lang: SupportedLanguage) {
  if (lang === 'hi') {
    return {
      heading: 'क्या इस रिपोर्ट के बारे में कोई सवाल है?',
      sub: 'आसान शब्दों में पूछें या बोलकर सवाल करें।',
      placeholder: 'जैसे: क्या इसके लिए खाना बदलना होगा?',
      askBtn: 'पूछें',
      micLabel: 'बोलकर पूछें',
      stopMic: 'रुकें',
      listening: 'सुन रहे हैं... अभी बोलें',
      thinking: 'आपकी रिपोर्ट देखकर आसान जवाब तैयार हो रहा है...',
      listen: 'सुनें',
      stopListen: 'रोकें',
      offlineErr: 'सवाल पूछने के लिए इंटरनेट चाहिए। अभी ऑफलाइन हैं।',
      fallbackErr: 'मैं इस हिस्से के बारे में पक्का नहीं कह सकता, कृपया डॉक्टर से पूछें।',
    };
  }
  if (lang === 'or') {
    return {
      heading: 'ଏହି ରିପୋର୍ଟ ବିଷୟରେ କିଛି ପ୍ରଶ୍ନ ଅଛି କି?',
      sub: 'ସରଳ ଭାଷାରେ ଲେଖନ୍ତୁ କିମ୍ବା କହି ପଚାରନ୍ତୁ।',
      placeholder: 'ଯଥା: ଏଥିପାଇଁ ଖାଦ୍ୟରେ କଣ ଧ୍ୟାନ ଦେବି?',
      askBtn: 'ପଚାରନ୍ତୁ',
      micLabel: 'କହି ପଚାରନ୍ତୁ',
      stopMic: 'ବନ୍ଦ କରନ୍ତୁ',
      listening: 'ଶୁଣୁଛି... ଏବେ କୁହନ୍ତୁ',
      thinking: 'ଆପଣଙ୍କ ରିପୋର୍ଟ ଦେଖି ସରଳ ଉତ୍ତର ପ୍ରସ୍ତୁତ ହେଉଛି...',
      listen: 'ଶୁଣନ୍ତୁ',
      stopListen: 'ବନ୍ଦ କରନ୍ତୁ',
      offlineErr: 'ପ୍ରଶ୍ନ ପଚାରିବା ପାଇଁ ଇଣ୍ଟରନେଟ୍ ଦରକାର।',
      fallbackErr: 'ମୁଁ ଏହି ଅଂଶ ବିଷୟରେ ନିଶ୍ଚିତ ନୁହେଁ, ଦୟାକରି ଡାକ୍ତରଙ୍କୁ ପଚାରନ୍ତୁ।',
    };
  }
  return {
    heading: 'Have a question about this?',
    sub: 'Type a short question or tap the mic to speak.',
    placeholder: 'e.g. Should I change my food or repeat this test?',
    askBtn: 'Ask',
    micLabel: 'Speak question',
    stopMic: 'Stop mic',
    listening: 'Listening... speak now',
    thinking: 'Checking your report for a simple answer...',
    listen: 'Listen',
    stopListen: 'Stop',
    offlineErr: 'Internet is needed to ask a new question right now.',
    fallbackErr: "I'm not sure about this part, please ask a doctor.",
  };
}

export const ReportQuestionBox: React.FC<ReportQuestionBoxProps> = ({
  report,
  language,
}) => {
  const copy = getUiCopy(language);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [lastAsked, setLastAsked] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const hasVoiceInput = Boolean(getSpeechRecognitionCtor());

  useEffect(() => {
    setAnswer(null);
    setLastAsked(null);
    setErrorMsg(null);
  }, [report.id]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      speechService.stop();
    };
  }, []);

  const handleSubmit = async (explicitText?: string) => {
    const cleanQ = (explicitText ?? question).trim();
    if (!cleanQ || isLoading) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg(copy.offlineErr);
      return;
    }

    speechService.stop();
    setIsSpeaking(false);
    setErrorMsg(null);
    setIsLoading(true);
    setLastAsked(cleanQ);

    try {
      const res = await fetch('/api/report-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': getClientDeviceId(),
        },
        body: JSON.stringify({
          report: {
            report_type: report.report_type,
            overall_severity: report.overall_severity,
            severity_reason: report.severity_reason,
            findings: (report.findings || []).slice(0, 20).map((f) => ({
              name: f.name,
              value: f.value,
              unit: f.unit,
              reference_range: f.reference_range,
              status: f.status,
              short_explanation: f.short_explanation,
            })),
          },
          question: cleanQ,
          language,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.answer) {
        setAnswer(String(data.answer).trim());
        setQuestion('');
      } else {
        setAnswer(copy.fallbackErr);
      }
    } catch {
      setAnswer(copy.fallbackErr);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMic = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    try {
      const rec = new Ctor();
      rec.lang = language === 'hi' ? 'hi-IN' : language === 'or' ? 'or-IN' : 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || '';
        if (transcript) {
          setQuestion(transcript);
          void handleSubmit(transcript);
        }
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      setErrorMsg(null);
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleToggleSpeakAnswer = () => {
    if (!answer) return;
    if (isSpeaking) {
      speechService.stop();
      setIsSpeaking(false);
      return;
    }
    speechService.speak(
      answer,
      language,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  return (
    <div className="rs-card p-5 space-y-3.5 print:hidden">
      <div className="flex items-start gap-2.5">
        <MessageCircleQuestion className="w-5 h-5 text-[var(--color-brand)] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-[var(--color-text)] leading-snug">
            {copy.heading}
          </h3>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            {copy.sub}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={isListening ? copy.listening : copy.placeholder}
          maxLength={240}
          className="flex-1 min-w-0 rounded-[12px] border border-[var(--color-divider)] bg-[var(--color-bg)] px-3.5 py-2.5 text-base font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-brand)]"
        />

        {hasVoiceInput && (
          <button
            type="button"
            onClick={handleToggleMic}
            aria-label={isListening ? copy.stopMic : copy.micLabel}
            title={isListening ? copy.stopMic : copy.micLabel}
            className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 transition ${
              isListening
                ? 'bg-[var(--color-danger)] text-white'
                : 'bg-[var(--color-surface-subtle)] text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          aria-label={copy.askBtn}
          className="rs-btn-primary h-11 px-4 inline-flex items-center justify-center gap-1.5 text-sm font-extrabold disabled:opacity-45 shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{copy.askBtn}</span>
        </button>
      </form>

      {errorMsg && (
        <p className="text-xs font-semibold text-[var(--color-danger)]">{errorMsg}</p>
      )}

      {isLoading && (
        <div className="rounded-[12px] bg-[var(--color-bg)] px-4 py-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand)] shrink-0" />
          <span>{copy.thinking}</span>
        </div>
      )}

      {answer && !isLoading && (
        <div className="rounded-[14px] bg-[var(--color-brand-soft)]/55 p-4 space-y-2.5">
          {lastAsked && (
            <p className="text-xs font-bold text-[var(--color-text-secondary)]">
              {lastAsked}
            </p>
          )}
          <p className="text-base font-semibold text-[var(--color-text)] leading-relaxed">
            {answer}
          </p>
          {speechService.isAvailable() && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleToggleSpeakAnswer}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--color-brand)] shadow-[var(--shadow-card)]"
              >
                {isSpeaking ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>{isSpeaking ? copy.stopListen : copy.listen}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
