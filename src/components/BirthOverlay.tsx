import React from 'react';
import { BirthSceneStep } from '../engine/birthSequence';
import { ORIGINS, OriginId } from '../sim/types';

interface BirthOverlayProps {
  step: BirthSceneStep;
  progress: number;
  origin: OriginId;
  onSkip: () => void;
}

export const BirthOverlay: React.FC<BirthOverlayProps> = ({
  step,
  progress,
  origin,
  onSkip,
}) => {
  const accent = ORIGINS[origin].accentHex;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none">
      <div className="flex items-center justify-between">
        <div className="font-mono-tabular text-xs text-neutral-400 hud-text-shadow">
          Sequence {step.sceneNumber} / 6 · {ORIGINS[origin].name} Core
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="pointer-events-auto px-4 py-2 text-xs font-medium text-neutral-200 border border-neutral-700 hover:border-neutral-400 rounded-md cursor-pointer transition-colors"
          style={{ backgroundColor: 'rgba(11, 14, 20, 0.85)' }}
        >
          Skip Awakening
        </button>
      </div>

      <div className="max-w-xl mx-auto text-center pb-8">
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-white hud-text-shadow tracking-tight">
          {step.caption}
        </h1>
        <p className="mt-2 text-sm text-neutral-300 hud-text-shadow">{step.subcaption}</p>
        <div className="mt-5 w-56 h-1 mx-auto bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: accent,
            }}
          />
        </div>
      </div>
    </div>
  );
};
