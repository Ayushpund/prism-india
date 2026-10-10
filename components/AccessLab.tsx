'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ToolMeta } from '@/lib/toolsMeta';

const SPEECH = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'हिन्दी Hindi' },
  { code: 'ta-IN', label: 'தமிழ் Tamil' },
  { code: 'bn-IN', label: 'বাংলা Bengali' },
  { code: 'te-IN', label: 'తెలుగు Telugu' },
  { code: 'mr-IN', label: 'मराठी Marathi' },
  { code: 'gu-IN', label: 'ગુજરાતી Gujarati' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ Kannada' },
  { code: 'ml-IN', label: 'മലയാളം Malayalam' },
];

const SAMPLE =
  'Applicants who have previously submitted documentation pertaining to residential verification are hereby required to furnish supplementary evidence in the event that the aforementioned documentation is deemed insufficient by the concerned authority. Please visit the nearest office with your original papers. Bring two photographs.';

const SENTENCE_SPLIT = /(?<=[.!?।])\s+/;
const syllables = (w: string) => Math.max(1, (w.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g) ?? []).length);

function analyze(text: string) {
  const sentences = text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
  const words = text.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
  const letters = text.match(/\p{L}/gu) ?? [];
  const latin = letters.filter((c) => /[A-Za-z]/.test(c)).length;
  const isLatin = letters.length > 0 && latin / letters.length > 0.6;
  const avgLen = sentences.length ? words.length / sentences.length : 0;
  let ease: number | null = null;
  let grade: number | null = null;
  let hard: string[] = [];
  if (isLatin && words.length >= 5) {
    const syl = words.reduce((s, w) => s + syllables(w), 0);
    ease = 206.835 - 1.015 * avgLen - 84.6 * (syl / words.length);
    grade = 0.39 * avgLen + 11.8 * (syl / words.length) - 15.59;
    hard = [...new Set(words.filter((w) => syllables(w) >= 4).map((w) => w.toLowerCase()))].slice(0, 10);
  }
  const long = sentences.filter((s) => (s.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length > 25);
  return { sentences, words: words.length, avgLen, ease, grade, hard, long, isLatin };
}

const easeLabel = (e: number) => (e >= 70 ? ['Easy to read', '#12B76A'] : e >= 50 ? ['Fairly difficult', '#FF9F1C'] : ['Difficult', '#E11D2E']);

export default function AccessLab({ tool }: { tool: ToolMeta }) {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('en-IN');
  const [rate, setRate] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const utter = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return setSupported(false);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const a = useMemo(() => analyze(text), [text]);
  const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));

  const speak = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => setSpeaking(false);
    utter.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const sel = 'rounded-md border-2 border-ink bg-card px-3 py-2 text-sm font-bold';
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8">
        <div>
          <div className="mb-2 flex items-end justify-between gap-2">
            <label htmlFor="lab-text" className="micro">Paste text to check</label>
            <button type="button" onClick={() => setText(SAMPLE)} className="chip px-3 py-1 text-xs">Use a sample notice</button>
          </div>
          <textarea id="lab-text" value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={tool.placeholder} className="card w-full resize-y p-4 text-base leading-relaxed outline-none" />
          <p className="micro mt-2">Processed in your browser. Nothing is uploaded. 0 credits.</p>
        </div>

        {text.trim() && (
          <section aria-label="Readability" className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-4">
              <li className="card p-4"><div className="micro">Words</div><div className="font-display text-3xl font-extrabold">{a.words}</div></li>
              <li className="card p-4"><div className="micro">Sentences</div><div className="font-display text-3xl font-extrabold">{a.sentences.length}</div></li>
              <li className="card p-4"><div className="micro">Words / sentence</div><div className="font-display text-3xl font-extrabold">{a.avgLen.toFixed(1)}</div></li>
              <li className="card p-4">
                <div className="micro">Reading ease</div>
                {a.ease !== null ? (<><div className="font-display text-3xl font-extrabold">{Math.max(0, Math.round(a.ease))}</div><div className="text-xs font-bold" style={{ color: easeLabel(a.ease)[1] }}>{easeLabel(a.ease)[0]} · grade {Math.max(1, Math.round(a.grade ?? 0))}</div></>) : (<div className="text-xs text-mute">Score is for English text only</div>)}
              </li>
            </ul>
            {a.long.length > 0 && (
              <div className="card p-4">
                <h2 className="font-display text-lg font-extrabold">Long sentences to simplify ({a.long.length})</h2>
                <p className="text-xs text-mute">Aim for under 20 words. Split these, or cut the extras.</p>
                <ul className="mt-3 space-y-2">{a.long.map((s) => <li key={s} className="border-l-8 border-yellow bg-yellow/30 p-2 text-sm">{s}</li>)}</ul>
              </div>
            )}
            {a.hard.length > 0 && (
              <div className="card p-4">
                <h2 className="font-display text-lg font-extrabold">Hard words</h2>
                <p className="mt-2 flex flex-wrap gap-2">{a.hard.map((w) => <span key={w} className="rounded-full border-2 border-ink bg-card px-3 py-0.5 text-sm font-bold">{w}</span>)}</p>
                <p className="mt-2 text-xs text-mute">Try shorter, everyday words (for example “use” instead of “utilise”).</p>
              </div>
            )}
          </section>
        )}

        <section aria-label="Read aloud" className="card p-5">
          <h2 className="font-display text-xl font-extrabold">Read aloud</h2>
          {!supported ? (
            <p className="mt-2 text-sm">Your browser does not support speech. Try Chrome, Edge or Safari.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold">Language
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className={sel}>{SPEECH.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">Speed {rate.toFixed(1)}×
                  <input type="range" min={0.6} max={1.4} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="accent-ink" />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={speak} disabled={!text.trim() || speaking} className="btn px-5 py-2 text-sm disabled:opacity-50">▶ Play</button>
                <button type="button" onClick={stop} disabled={!speaking} className="btn btn-dark px-5 py-2 text-sm disabled:opacity-50">■ Stop</button>
              </div>
              <p className="mt-3 text-xs text-mute" role="status">
                {voices.length === 0 ? 'Loading voices…' : voice ? `Using voice: ${voice.name}` : `No ${lang} voice is installed on this device. Install one in your system speech settings for natural reading.`}
              </p>
            </>
          )}
        </section>
      </div>

      <aside className="space-y-6" aria-label="Guidance">
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Use it wisely</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">{tool.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Display settings</h2>
          <p className="mt-2 text-sm">Use the <b>Aa Display</b> button in the header for bigger text, high contrast, an easy-read font, roomier spacing and calm motion. It applies across the whole site.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-display text-lg font-extrabold">Official guidance</h2>
          <ul className="mt-3 space-y-3">
            {tool.official.map((o) => (
              <li key={o.url}><a href={o.url} target="_blank" rel="noreferrer noopener" className="font-bold underline-offset-4 hover:underline">{o.name} ↗</a><div className="text-xs text-mute">{o.note}</div></li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
