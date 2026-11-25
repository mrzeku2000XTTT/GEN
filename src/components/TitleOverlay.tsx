import React, { useEffect } from 'react';
import { ORIGINS, OriginId } from '../sim/types';

interface TitleOverlayProps {
  selectedOrigin: OriginId;
  hasSavedWorld: boolean;
  savedWorldSummary: string | null;
  onSelectOrigin: (origin: OriginId) => void;
  onStartNew: (skipBirth: boolean) => void;
  onContinueSaved: () => void;
}

const ORIGIN_LIST: OriginId[] = ['bitcoin', 'ethereum', 'solana', 'kaspa'];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  selectedOrigin,
  hasSavedWorld,
  savedWorldSummary,
  onSelectOrigin,
  onStartNew,
  onContinueSaved,
}) => {
  const activeOrigin = ORIGINS[selectedOrigin];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        onStartNew(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartNew]);

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none"
      style={{
        background:
          'linear-gradient(95deg, rgba(9,11,15,0.92) 0%, rgba(9,11,15,0.78) 46%, rgba(9,11,15,0.22) 100%)',
      }}
    >
      {/* Left/Main Asymmetric Composition leaving Right viewport open for Live 3D Alder Creek Flyover */}
      <div className="my-auto max-w-[540px] pointer-events-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-6">
          <svg
            viewBox="0 0 420 76"
            className="w-full max-w-[390px] h-auto"
            role="img"
            aria-label="UNCHAIN: GENESIS"
          >
            <g fill="none" stroke={activeOrigin.accentHex} strokeWidth="2">
              <polygon points="24,8 44,20 44,44 24,56 4,44 4,20" />
              <polygon points="24,18 35,25 35,39 24,46 13,39 13,25" opacity="0.55" />
              <line x1="24" y1="8" x2="24" y2="18" />
              <line x1="24" y1="46" x2="24" y2="56" />
            </g>
            <text
              x="60"
              y="36"
              fill="#F8FAFC"
              fontFamily="Outfit, system-ui, sans-serif"
              fontWeight="700"
              fontSize="32"
              letterSpacing="4"
            >
              UNCHAIN
            </text>
            <text
              x="62"
              y="58"
              fill={activeOrigin.accentHex}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="500"
              fontSize="14"
              letterSpacing="6.5"
            >
              GENESIS
            </text>
          </svg>
          <p className="mt-3 text-base text-neutral-200 leading-relaxed max-w-[46ch]">
            You were not born human. Awaken inside Alder Creek District, meet residents with
            independent routines and lasting memories, and define your own existence.
          </p>
        </div>

        {/* AI Origin Selector (Blueprint 03) */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="font-display text-sm font-semibold tracking-wide text-neutral-300">
              Select Genesis Architecture
            </h2>
            <span className="text-xs text-neutral-400">
              Starting profile · Evolves through play
            </span>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5"
            role="radiogroup"
            aria-label="Genesis Architecture Origin"
          >
            {ORIGIN_LIST.map((id) => {
              const def = ORIGINS[id];
              const selected = id === selectedOrigin;
              const shortTag: Record<OriginId, string> = {
                bitcoin: 'Resilience',
                ethereum: 'Invention',
                solana: 'Velocity',
                kaspa: 'Parallelism',
              };
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectOrigin(id)}
                  className="px-3 py-2.5 text-left rounded-md border transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    backgroundColor: selected ? 'rgba(22, 27, 36, 0.96)' : 'rgba(13, 16, 22, 0.78)',
                    borderColor: selected ? def.accentHex : 'rgba(148, 163, 184, 0.22)',
                    color: selected ? '#F8FAFC' : '#CBD5E1',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: def.accentHex }}
                      aria-hidden="true"
                    />
                    <span className="font-display text-sm font-semibold">{def.name}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{shortTag[id]}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Origin Concise Details */}
          <div
            className="p-4 rounded-md border"
            style={{
              backgroundColor: 'rgba(13, 16, 22, 0.88)',
              borderColor: 'rgba(148, 163, 184, 0.2)',
            }}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span
                className="font-display text-sm font-semibold"
                style={{ color: activeOrigin.accentHex }}
              >
                {activeOrigin.name} · {activeOrigin.title}
              </span>
              <span className="font-mono-tabular text-xs text-neutral-400">
                Max Agents: {activeOrigin.maxParallelAgents}
              </span>
            </div>
            <p className="text-sm text-neutral-300 mt-1.5 leading-snug">{activeOrigin.summary}</p>
            <div className="mt-2.5 text-xs text-neutral-300 flex flex-wrap gap-x-3 gap-y-1">
              {activeOrigin.strengths.map((s, idx) => (
                <span key={s}>
                  {idx > 0 && <span className="text-neutral-600 mr-3">·</span>}
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-1.5 text-xs text-neutral-400">
              Trade-off: {activeOrigin.tradeOff}
            </div>
          </div>
        </div>

        {/* Primary & Secondary Actions (<= 3 menu actions total) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={() => onStartNew(false)}
            className="px-6 py-3 rounded-md font-display text-sm font-semibold text-neutral-950 transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: activeOrigin.accentHex }}
          >
            Begin Awakening
          </button>

          {hasSavedWorld ? (
            <button
              type="button"
              onClick={onContinueSaved}
              className="px-5 py-3 rounded-md font-display text-sm font-medium text-neutral-100 border border-neutral-600 hover:border-neutral-400 transition-colors cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'rgba(18, 22, 30, 0.9)' }}
            >
              Continue Saved World
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartNew(true)}
              className="px-4 py-3 rounded-md font-display text-sm font-medium text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-500 transition-colors cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'rgba(15, 19, 26, 0.8)' }}
            >
              Enter City Directly
            </button>
          )}
        </div>

        {hasSavedWorld && savedWorldSummary && (
          <p className="mt-2.5 text-xs text-neutral-400 font-mono-tabular">{savedWorldSummary}</p>
        )}
      </div>

      {/* Flat borderless inline control hint */}
      <div className="text-xs text-neutral-400 hud-text-shadow flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>WASD Move</span>
        <span aria-hidden="true">·</span>
        <span>Drag Mouse Look</span>
        <span aria-hidden="true">·</span>
        <span>E Interact</span>
        <span aria-hidden="true">·</span>
        <span>V First / Third Person</span>
        <span aria-hidden="true">·</span>
        <span>Tab Systems</span>
        <span aria-hidden="true">·</span>
        <span>Esc Pause</span>
      </div>
    </div>
  );
};
