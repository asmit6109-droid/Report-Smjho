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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{mt.chatTitle}</h3>
              <p className="text-[11px] font-medium text-slate-500">
                {medicine.medicine.brand}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verified boundary notice */}
        <div className="bg-teal-50/70 border-b border-teal-100 px-4 py-2 flex items-center gap-2 text-[11px] font-bold text-teal-900">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{mt.chatSubtitle}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">Tap a quick question:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((qq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qq)}
                    className="rounded-2xl border border-teal-200 bg-teal-50/60 px-3 py-2 text-xs font-bold text-teal-900 hover:bg-teal-100 text-left transition"
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
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-900 border border-slate-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700">
              <Loader2 className="w-4 h-4 animate-spin" />
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
          className="p-3 border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mt.chatPlaceholder}
            className="flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="rounded-2xl bg-teal-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-teal-800 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{mt.chatSend}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
