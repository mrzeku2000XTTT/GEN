import React from 'react';
import { Eye, Layers, Pause, Save, Volume2, VolumeX, X } from 'lucide-react';
import { HudSnapshot, ORIGINS } from '../sim/types';
import { BUILDINGS, WORLD_HALF_EXTENT } from '../sim/worldLayout';

interface PlayingHudProps {
  hud: HudSnapshot;
  muted: boolean;
  toastMessage: string | null;
  onToggleCamera: () => void;
  onOpenSystems: () => void;
  onQuickSave: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onInteractClick: () => void;
  onCancelAutonomous: () => void;
}

const WEATHER_LABELS: Record<HudSnapshot['weather'], string> = {
  clear: 'Clear',
  overcast: 'Overcast',
  light_rain: 'Light Rain',
  golden_mist: 'Golden Mist',
};

export const PlayingHud: React.FC<PlayingHudProps> = ({
  hud,
  muted,
  toastMessage,
  onToggleCamera,
  onOpenSystems,
  onQuickSave,
  onToggleMute,
  onPause,
  onInteractClick,
  onCancelAutonomous,
}) => {
  const accent = ORIGINS[hud.origin].accentHex;
  const mapSize = 112;
  const mapSpan = WORLD_HALF_EXTENT * 2;
  const toMapX = (wx: number) => ((wx + WORLD_HALF_EXTENT) / mapSpan) * mapSize;
  const toMapY = (wz: number) => ((wz + WORLD_HALF_EXTENT) / mapSpan) * mapSize;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-5">
      {/* Top Perimeter Row: Left Readout + Right Utility Controls & Architectural Minimap */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Minimal Readout */}
        <div
          className="px-3.5 py-2.5 rounded-md border max-w-md"
          style={{
            backgroundColor: 'rgba(11, 14, 20, 0.84)',
            borderColor: 'rgba(148, 163, 184, 0.2)',
          }}
        >
          <div className="flex items-center gap-2.5 text-xs text-neutral-300 font-mono-tabular">
            <span className="font-semibold text-white">Day {hud.day}</span>
            <span aria-hidden="true" className="text-neutral-600">
              ·
            </span>
            <span className="text-white">{hud.timeFormatted}</span>
            <span aria-hidden="true" className="text-neutral-600">
              ·
            </span>
            <span>{WEATHER_LABELS[hud.weather]}</span>
          </div>

          <div className="mt-1 font-display text-sm font-semibold text-neutral-100 truncate">
            {hud.locationName}
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs font-mono-tabular">
            <div>
              <span className="text-neutral-400 mr-1.5">Credits</span>
              <span className="text-white font-semibold">₵{hud.balance}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Energy</span>
              <div className="w-16 h-1.5 bg-neutral-800 rounded-xs overflow-hidden">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${hud.energy}%`,
                    backgroundColor: hud.energy < 25 ? '#EF4444' : accent,
                  }}
                />
              </div>
              <span className="text-neutral-200">{hud.energy}%</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-neutral-800 text-[12px] text-neutral-300 leading-snug">
            <span className="text-neutral-400 mr-1.5">Objective:</span>
            {hud.currentObjective}
          </div>
        </div>

        {/* Top-Right Compact Utility Controls + Minimap */}
        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Switch camera view (currently ${hud.cameraMode === 'first' ? 'first-person' : 'third-person'})`}
              title="Camera View [V]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCamera();
              }}
              className="h-9 px-2.5 rounded-md border border-neutral-700 hover:border-neutral-400 text-neutral-200 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
              style={{ backgroundColor: 'rgba(11, 14, 20, 0.86)' }}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{hud.cameraMode === 'first' ? '1st' : '3rd'}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Open Systems & Mind interface"
              title="Systems & Mind [Tab]"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenSystems();
              }}
              className="h-9 px-3 rounded-md border text-neutral-100 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: 'rgba(11, 14, 20, 0.88)',
                borderColor: accent,
              }}
            >
              <Layers className="w-3.5 h-3.5" style={{ color: accent }} aria-hidden="true" />
              <span>Mind</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Save World"
              title="Save World"
              onClick={(e) => {
                e.currentTarget.blur();
                onQuickSave();
              }}
              className="w-9 h-9 rounded-md border border-neutral-700 hover:border-neutral-400 text-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
              style={{ backgroundColor: 'rgba(11, 14, 20, 0.86)' }}
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
              title={muted ? 'Unmute' : 'Mute'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-9 h-9 rounded-md border border-neutral-700 hover:border-neutral-400 text-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
              style={{ backgroundColor: 'rgba(11, 14, 20, 0.86)' }}
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Simulation"
              title="Pause [Esc]"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="w-9 h-9 rounded-md border border-neutral-700 hover:border-neutral-400 text-neutral-200 flex items-center justify-center cursor-pointer transition-colors"
              style={{ backgroundColor: 'rgba(11, 14, 20, 0.86)' }}
            >
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Compact Architectural Minimap (real level geometry & NPC positions) */}
          <div
            className="hidden sm:block rounded-md border p-1.5"
            style={{
              backgroundColor: 'rgba(11, 14, 20, 0.84)',
              borderColor: 'rgba(148, 163, 184, 0.22)',
            }}
            aria-label="Alder Creek District Minimap"
          >
            <svg width={mapSize} height={mapSize} viewBox={`0 0 ${mapSize} ${mapSize}`}>
              <rect width={mapSize} height={mapSize} fill="#141922" rx="3" />
              {/* Park center highlight */}
              <rect
                x={toMapX(-9.5)}
                y={toMapY(-21)}
                width={(19 / mapSpan) * mapSize}
                height={(38 / mapSpan) * mapSize}
                fill="#1d3326"
              />
              {/* Building footprints */}
              {BUILDINGS.map((b) => (
                <rect
                  key={b.id}
                  x={toMapX(b.x - b.width / 2)}
                  y={toMapY(b.z - b.depth / 2)}
                  width={(b.width / mapSpan) * mapSize}
                  height={(b.depth / mapSpan) * mapSize}
                  fill={b.interactable ? '#445266' : '#2d3644'}
                  stroke="#64748b"
                  strokeWidth="0.6"
                />
              ))}
              {/* Live NPC markers */}
              {hud.minimapNpcs.map((n) => (
                <circle
                  key={n.id}
                  cx={toMapX(n.x)}
                  cy={toMapY(n.z)}
                  r={n.familiar ? 2.4 : 1.7}
                  fill={n.familiar ? '#fbbf24' : '#cbd5e1'}
                />
              ))}
              {/* Player marker + facing vector */}
              <g
                transform={`translate(${toMapX(hud.playerX)}, ${toMapY(hud.playerZ)}) rotate(${
                  (-hud.playerYaw * 180) / Math.PI
                })`}
              >
                <polygon points="0,-4.5 3,3.5 -3,3.5" fill={accent} stroke="#090b0f" strokeWidth="0.8" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* First-person minimal center reticle */}
      {hud.cameraMode === 'first' && (
        <div
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/80 shadow" />
        </div>
      )}

      {/* Bottom-Center Contextual Prompt, Autonomous Flow Strip, and Subtle Toast */}
      <div className="flex flex-col items-center gap-2.5">
        {toastMessage && (
          <div
            role="status"
            className="px-4 py-2 rounded-md border text-xs font-medium text-neutral-100"
            style={{
              backgroundColor: 'rgba(15, 20, 28, 0.94)',
              borderColor: accent,
            }}
          >
            {toastMessage}
          </div>
        )}

        {hud.autonomousFlow.active && (
          <div
            className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-md border text-xs"
            style={{
              backgroundColor: 'rgba(11, 14, 20, 0.92)',
              borderColor: accent,
            }}
          >
            <span className="font-mono-tabular font-semibold" style={{ color: accent }}>
              {hud.autonomousFlow.stage}
            </span>
            <span className="text-neutral-200 max-w-xs truncate">
              {hud.autonomousFlow.objectiveLabel}
            </span>
            <button
              type="button"
              onClick={onCancelAutonomous}
              className="px-2 py-1 rounded border border-neutral-700 hover:border-neutral-400 text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" aria-hidden="true" />
              Cancel
            </button>
          </div>
        )}

        {hud.nearbyPrompt && (
          <button
            type="button"
            onClick={onInteractClick}
            className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-md border cursor-pointer transition-colors hover:border-white"
            style={{
              backgroundColor: 'rgba(11, 14, 20, 0.92)',
              borderColor: accent,
            }}
          >
            <span
              className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded-xs text-neutral-950"
              style={{ backgroundColor: accent }}
            >
              E
            </span>
            <div className="text-left">
              <div className="font-display text-sm font-semibold text-white leading-tight">
                {hud.nearbyPrompt.title}
              </div>
              <div className="text-[11px] text-neutral-300">{hud.nearbyPrompt.subtitle}</div>
            </div>
          </button>
        )}

        <div
          className="text-[11px] text-neutral-200 px-3.5 py-1 rounded border flex items-center gap-2.5"
          style={{
            backgroundColor: 'rgba(11, 14, 20, 0.78)',
            borderColor: 'rgba(148, 163, 184, 0.18)',
          }}
        >
          <span>WASD Move</span>
          <span aria-hidden="true" className="text-neutral-500">·</span>
          <span>Shift Run</span>
          <span aria-hidden="true" className="text-neutral-500">·</span>
          <span>Space Jump</span>
          <span aria-hidden="true" className="text-neutral-500">·</span>
          <span>Drag Look</span>
          <span aria-hidden="true" className="text-neutral-500">·</span>
          <span>E Interact</span>
          <span aria-hidden="true" className="text-neutral-500">·</span>
          <span>Tab Mind</span>
        </div>
      </div>
    </div>
  );
};
