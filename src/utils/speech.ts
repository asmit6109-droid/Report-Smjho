import { SupportedLanguage } from './translations';

class SpeechManager {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingState = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return !!this.synth;
  }

  public speak(
    text: string,
    lang: SupportedLanguage,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: () => void
  ): void {
    if (!this.synth) {
      onError?.();
      return;
    }

    // Cancel ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Set language tag
    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (lang === 'or') {
      // Odia voice support in browser synthesis is often mapped or falls back to Indian accent
      utterance.lang = 'or-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.9; // Slightly slower, clear cadence for low-literacy users
    utterance.pitch = 1.0;

    // Pick best available voice if possible
    const voices = this.synth.getVoices();
    const matchedVoice = voices.find((v) => {
      if (lang === 'hi') return v.lang.startsWith('hi');
      if (lang === 'or') return v.lang.startsWith('or') || v.lang.startsWith('hi');
      return v.lang.startsWith('en-IN') || v.lang.startsWith('en');
    });

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      this.isSpeakingState = true;
      onStart?.();
    };

    utterance.onend = () => {
      this.isSpeakingState = false;
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('Speech error', e);
      this.isSpeakingState = false;
      this.currentUtterance = null;
      onError?.();
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis call failed', err);
      this.isSpeakingState = false;
      onError?.();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeakingState = false;
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState || (!!this.synth && this.synth.speaking);
  }
}

export const speechService = new SpeechManager();
