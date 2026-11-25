import React from 'react';
import { ORIGINS, WorldState } from '../sim/types';

interface PauseModalProps {
  world: WorldState;
  onResume: () => void;
  onSaveAndNotify: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  world,
  onResume,
  onSaveAndNotify,
  onReturnToTitle,
}) => {
  const accent = ORIGINS[world.player.origin].accentHex;
  const residentsMet = world.npcs.filter((n) => n.relationship.interactionsCount > 0).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 12, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Simulation Paused"
    >
      <div
        className="w-full max-w-md rounded-lg border p-6 space-y-5"
        style={{
          backgroundColor: '#10141c',
          borderColor: 'rgba(148, 163, 184, 0.25)',
        }}
      >
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Simulation Paused</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Alder Creek District · {ORIGINS[world.player.origin].name} Origin
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 rounded border border-neutral-800" style={{ backgroundColor: '#151a24' }}>
            <div className="font-mono-tabular text-lg font-semibold text-white">{world.day}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Day</div>
          </div>
          <div className="p-3 rounded border border-neutral-800" style={{ backgroundColor: '#151a24' }}>
            <div className="font-mono-tabular text-lg font-semibold text-white">
              ₵{Math.round(world.player.balance)}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Credits</div>
          </div>
          <div className="p-3 rounded border border-neutral-800" style={{ backgroundColor: '#151a24' }}>
            <div className="font-mono-tabular text-lg font-semibold text-white">
              {residentsMet}/20
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Humans Met</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 rounded-md font-display text-sm font-semibold text-neutral-950 cursor-pointer"
            style={{ backgroundColor: accent }}
          >
            Resume World
          </button>
          <button
            type="button"
            onClick={onSaveAndNotify}
            className="w-full py-2.5 rounded-md font-display text-sm font-medium text-neutral-100 border border-neutral-700 hover:border-neutral-400 cursor-pointer"
            style={{ backgroundColor: '#171d28' }}
          >
            Save Progress
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2.5 rounded-md font-display text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
