import React, { useState } from 'react';
import { MedicineAnalysis } from '../../types/medicine';
import { SupportedLanguage } from '../../utils/translations';
import { medicineTranslations } from '../../utils/medicineTranslations';
import { getHealthProfile } from '../../utils/storage';
import { X, Send, Loader2, ShieldCheck, MessageCircleQuestion } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface MedicineChatModalProps {
  medicine: MedicineAnalysis;
  language: SupportedLanguage;
  onClose: () => void;
}

export const MedicineChatModal: React.FC<MedicineChatModalProps> = ({
  medicine,
  language,
  onClose,
}) => {
  const mt = medicineTranslations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const quickQuestions = [
    language === 'hi'
      ? 'क्या इसे खाने के बाद लें?'
      : language === 'or'
      ? 'ଏହା ଖାଇବା ପରେ ନେବି କି?'
      : 'Should I take it with food?',
    language === 'hi'
      ? 'इसके आम साइड इफेक्ट क्या हैं?'
      : language === 'or'
      ? 'ଏହାର ସାଧାରଣ ପାର୍ଶ୍ୱ ପ୍ରତିକ୍ରିୟା କଣ?'
      : 'What are common side effects?',
    language === 'hi'
      ? 'कौन सी चीज़ें साथ में न लें?'
      : language === 'or'
      ? 'କଣ ସହିତ ଏହା ମିଶାଇବି ନାହିଁ?'
      : 'What should I avoid with this?',
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q || isSending) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    if (!questionText) setInput('');
    setIsSending(true);

    try {
      const hp = getHealthProfile();
      const res = await fetch('/api/medicine-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine,
          question: q,
          language,
          healthProfile: hp,
        }),
      });
      const raw = await res.text();
      const data = JSON.parse(raw);
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Could not answer right now.');
      }
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            language === 'hi'
              ? 'मैं पक्का नहीं कह सकता। कृपया अपने डॉक्टर या फार्मासिस्ट से पूछें।'
              : language === 'or'
              ? 'ମୁଁ ନିଶ୍ଚିତ ନୁହେଁ। ଦୟାକରି ଆପଣଙ୍କ ଡାକ୍ତର ବା ଫାର୍ମାସିଷ୍ଟଙ୍କୁ ପଚାରନ୍ତୁ।'
              : 'I am not sure. Please ask your pharmacist or doctor.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[var(--color-text)]/50 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-t-[16px] sm:rounded-[16px] bg-[var(--color-surface)] shadow-[var(--shadow-card)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-divider)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[var(--color-text)]">{mt.chatTitle}</h3>
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                {medicine.medicine.brand}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verified boundary notice */}
        <div className="bg-[var(--color-brand-soft)] px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-[var(--color-brand)]">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{mt.chatSubtitle}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-base font-bold text-[var(--color-text-secondary)]">
                Tap a quick question:
              </p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((qq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qq)}
                    className="rounded-[14px] bg-[var(--color-brand-soft)] px-4 py-2.5 text-base font-bold text-[var(--color-brand)] hover:bg-[var(--color-divider)] text-left transition"
                  >
                    {qq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-[16px] px-4 py-3 text-base font-semibold leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text)]'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-base font-bold text-[var(--color-brand)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking verified details...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 border-t border-[var(--color-divider)] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mt.chatPlaceholder}
            className="flex-1 rounded-[14px] bg-[var(--color-bg)] px-4 py-3 text-base text-[var(--color-text)] focus:outline-2 focus:outline-[var(--color-brand)]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="rs-btn-primary px-4 py-3 text-base font-extrabold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>{mt.chatSend}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
