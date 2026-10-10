'use client';
import { useEffect, useRef, useState } from 'react';

const VOICES = [
  { code: 'en-IN', label: 'EN' },
  { code: 'hi-IN', label: 'हिं' },
  { code: 'ta-IN', label: 'தமி' },
  { code: 'bn-IN', label: 'বাং' },
  { code: 'te-IN', label: 'తెలు' },
  { code: 'mr-IN', label: 'मरा' },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Speak your search in an Indian language. Uses the browser's built-in speech recognition (no server, no credits). Hidden if unsupported. */
export default function VoiceInput({ onText, className = '' }: { onText: (t: string) => void; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [lang, setLang] = useState('en-IN');
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.abort?.();
  }, []);

  if (!supported) return null;

  const start = () => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setErr(null);
    if (listening) return rec.current?.stop?.();
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => onText(String(e.results?.[0]?.[0]?.transcript ?? '').trim());
    r.onerror = (e: any) => setErr(e.error === 'not-allowed' ? 'Microphone blocked. Allow it in your browser.' : e.error === 'no-speech' ? 'Did not hear anything.' : 'Voice search failed.');
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <label className="sr-only" htmlFor="voice-lang">Voice language</label>
      <select id="voice-lang" value={lang} onChange={(e) => setLang(e.target.value)} className="h-9 rounded-md border-2 border-ink bg-card px-1 text-xs font-bold">
        {VOICES.map((v) => <option key={v.code} value={v.code}>{v.label}</option>)}
      </select>
      <button type="button" onClick={start} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Search by voice'} title="Speak your search" className={`flex h-9 w-9 items-center justify-center rounded-md border-2 border-ink ${listening ? 'bg-red text-white' : 'bg-card'}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
      </button>
      {(listening || err) && <span role="status" className="micro ml-1 hidden sm:inline">{listening ? 'Listening…' : err}</span>}
    </div>
  );
}
