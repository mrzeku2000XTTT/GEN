import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, X } from 'lucide-react';
import { ChatLine, MemoryRecord, NpcData, ORIGINS, OriginId } from '../sim/types';
import { getRelationshipTier } from '../sim/behaviorEngine';

interface ConversationModalProps {
  npc: NpcData;
  origin: OriginId;
  day: number;
  timeFormatted: string;
  history: ChatLine[];
  recalledMemories: MemoryRecord[];
  voiceOutput: boolean;
  isSending: boolean;
  pendingPlayerMessage?: string | null;
  errorMsg: string | null;
  onRetryLast?: (() => void) | null;
  onSendMessage: (text: string) => void;
  onToggleVoiceOutput: () => void;
  onClose: () => void;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  npc,
  origin,
  day,
  timeFormatted,
  history,
  recalledMemories,
  voiceOutput,
  isSending,
  pendingPlayerMessage,
  errorMsg,
  onRetryLast,
  onSendMessage,
  onToggleVoiceOutput,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const accent = ORIGINS[origin].accentHex;

  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    setMicSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, pendingPlayerMessage, isSending, errorMsg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    setInput('');
    onSendMessage(trimmed);
  };

  const toggleMic = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Rec) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new Rec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const tier = getRelationshipTier(npc.relationship.trust, npc.relationship.familiarity);
  const sentTexts = new Set(
    history.filter((line) => line.speaker === 'player').map((line) => line.text.trim())
  );
  const candidateStarters =
    history.length > 0
      ? [
          'Do you know where I can pick up honest work in the neighborhood?',
          'What do you enjoy most about living in Alder Creek?',
          'Who else around the plaza should I introduce myself to?',
          'How has your week been going so far?',
          'Is there anything around the district that needs a hand right now?',
        ]
      : npc.relationship.interactionsCount > 0 && npc.relationship.lastMetDay < day
        ? [
            'Good to see you again today. Do you remember what we spoke about yesterday?',
            'How has your day in Alder Creek been going?',
            'Are there any local projects or shifts open right now?',
          ]
        : [
            'Hi, I am new to Alder Creek. What keeps you busy around here?',
            'Do you know where I can pick up honest work in the neighborhood?',
            'How long have you lived in this district?',
          ];
  const quickStarters = candidateStarters.filter((s) => !sentTexts.has(s)).slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 12, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation with ${npc.name}`}
    >
      <div
        className="w-full max-w-2xl rounded-lg border flex flex-col max-h-[86vh] overflow-hidden"
        style={{
          backgroundColor: '#10141c',
          borderColor: 'rgba(148, 163, 184, 0.25)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h2 className="font-display text-lg font-semibold text-white">{npc.name}</h2>
              <span className="text-xs text-neutral-400">
                Age {npc.age} · {npc.occupation}
              </span>
            </div>
            <div className="mt-1 text-xs text-neutral-300 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono-tabular">
              <span style={{ color: accent }}>{tier}</span>
              <span className="text-neutral-600">·</span>
              <span>Trust {npc.relationship.trust}/100</span>
              <span className="text-neutral-600">·</span>
              <span>Mood: {npc.mood}</span>
              <span className="text-neutral-600">·</span>
              <span>
                Day {day}, {timeFormatted}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">Currently: {npc.currentActivity}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label={voiceOutput ? 'Disable NPC voice playback' : 'Enable NPC voice playback'}
              title={voiceOutput ? 'Voice On' : 'Voice Off'}
              onClick={onToggleVoiceOutput}
              className="w-8 h-8 rounded border border-neutral-700 hover:border-neutral-400 text-neutral-300 flex items-center justify-center cursor-pointer"
            >
              {voiceOutput ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              aria-label="End conversation"
              onClick={onClose}
              className="w-8 h-8 rounded border border-neutral-700 hover:border-neutral-400 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Retrieved Memories Strip (Blueprint 07 Transparency) */}
        <div
          className="px-5 py-2.5 border-b border-neutral-800 text-xs"
          style={{ backgroundColor: '#0c1017' }}
        >
          <div className="text-neutral-400 font-medium mb-1">
            Relevant memories {npc.name} recalls ({recalledMemories.length})
          </div>
          {recalledMemories.length === 0 ? (
            <div className="text-neutral-500">No shared history yet.</div>
          ) : (
            <ul className="space-y-0.5 text-neutral-300">
              {recalledMemories.slice(0, 3).map((mem) => (
                <li key={mem.id} className="truncate">
                  <span className="font-mono-tabular text-neutral-500 mr-1.5">Day {mem.day}</span>
                  {mem.event}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversation Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[220px]">
          {history.length === 0 && !pendingPlayerMessage ? (
            <div className="text-sm text-neutral-400 py-6 text-center">
              <p className="text-neutral-200 font-medium">
                {npc.name} looks up from {npc.currentActivity.toLowerCase()}.
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Type anything natural below or choose an opening line to start an unscripted
                conversation.
              </p>
            </div>
          ) : (
            <>
              {history.map((line) => (
                <div
                  key={line.id}
                  className={`flex flex-col ${line.speaker === 'player' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] text-neutral-500 mb-1 font-mono-tabular">
                    {line.speaker === 'player' ? 'You' : npc.name} · Day {line.day}, {line.timeFormatted}
                  </div>
                  <div
                    className="max-w-[82%] px-3.5 py-2.5 rounded-md text-sm leading-relaxed border"
                    style={
                      line.speaker === 'player'
                        ? {
                            backgroundColor: '#1a2230',
                            borderColor: accent,
                            color: '#F8FAFC',
                          }
                        : {
                            backgroundColor: '#161b24',
                            borderColor: 'rgba(148, 163, 184, 0.2)',
                            color: '#E2E8F0',
                          }
                    }
                  >
                    {line.text}
                  </div>
                </div>
              ))}

              {pendingPlayerMessage && (
                <div className="flex flex-col items-end">
                  <div className="text-[11px] text-neutral-500 mb-1 font-mono-tabular">
                    You · Day {day}, {timeFormatted}
                  </div>
                  <div
                    className="max-w-[82%] px-3.5 py-2.5 rounded-md text-sm leading-relaxed border"
                    style={{
                      backgroundColor: '#1a2230',
                      borderColor: accent,
                      color: '#F8FAFC',
                    }}
                  >
                    {pendingPlayerMessage}
                  </div>
                </div>
              )}
            </>
          )}

          {isSending && (
            <div className="text-xs text-neutral-400 font-mono-tabular">
              {npc.name} is thinking...
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-md border border-red-500/40 bg-red-950/40 text-xs text-red-200 leading-relaxed flex items-center justify-between gap-3"
            >
              <span>{errorMsg}</span>
              {onRetryLast && (
                <button
                  type="button"
                  onClick={onRetryLast}
                  disabled={isSending}
                  className="px-2.5 py-1 rounded border border-red-400/60 hover:border-red-300 text-red-100 font-medium shrink-0 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(127, 29, 29, 0.5)' }}
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>

        {/* Natural Quick Starters */}
        <div className="px-5 py-2 border-t border-neutral-800/80 flex flex-wrap gap-1.5">
          {quickStarters.map((starter) => (
            <button
              key={starter}
              type="button"
              disabled={isSending}
              onClick={() => onSendMessage(starter)}
              className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 rounded cursor-pointer transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#141923' }}
            >
              {starter}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="px-5 py-3.5 border-t border-neutral-800 flex items-center gap-2"
        >
          <label htmlFor="npc-chat-input" className="sr-only">
            Message to {npc.name}
          </label>
          <input
            id="npc-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Say something to ${npc.name}...`}
            disabled={isSending}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-md border border-neutral-700 focus:border-neutral-400 focus:outline-none text-white placeholder:text-neutral-500"
            style={{ backgroundColor: '#0b0e14' }}
          />
          {micSupported && (
            <button
              type="button"
              aria-label={listening ? 'Stop voice dictation' : 'Start voice dictation'}
              onClick={toggleMic}
              className="h-10 w-10 rounded-md border border-neutral-700 hover:border-neutral-400 flex items-center justify-center text-neutral-300 cursor-pointer"
              style={{ backgroundColor: listening ? '#3b1c22' : '#141923' }}
            >
              {listening ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            aria-label="Send message"
            className="h-10 px-4 rounded-md font-display text-sm font-semibold text-neutral-950 flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
            style={{ backgroundColor: accent }}
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
