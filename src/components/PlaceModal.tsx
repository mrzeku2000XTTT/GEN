import React, { useEffect } from 'react';
import { Briefcase, Moon, ShoppingBag, Sparkles, X } from 'lucide-react';
import { BuildingDef, ORIGINS, WorldState } from '../sim/types';
import { JOBS, SHOP_ITEMS } from '../sim/worldLayout';
import { formatSimTime, getAdjustedItemPrice } from '../sim/behaviorEngine';

interface PlaceModalProps {
  building: BuildingDef;
  world: WorldState;
  feedback: { ok: boolean; text: string } | null;
  onWorkJob: (jobId: string) => void;
  onBuyItem: (itemId: string) => void;
  onRestNextMorning: () => void;
  onClinicRecharge: () => void;
  onClose: () => void;
}

export const PlaceModal: React.FC<PlaceModalProps> = ({
  building,
  world,
  feedback,
  onWorkJob,
  onBuyItem,
  onRestNextMorning,
  onClinicRecharge,
  onClose,
}) => {
  const accent = ORIGINS[world.player.origin].accentHex;
  const hour = world.minuteOfDay / 60;
  const isOpen = hour >= building.openHour && hour < building.closeHour;
  const localJobs = JOBS.filter((j) => j.placeId === building.id);
  const localItems = SHOP_ITEMS.filter((i) => i.placeId === building.id);
  const isResidential = building.category === 'residential';
  const isClinic = building.category === 'clinic';

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

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 12, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label={building.name}
    >
      <div
        className="w-full max-w-xl rounded-lg border overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: '#10141c',
          borderColor: 'rgba(148, 163, 184, 0.25)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{building.name}</h2>
            <div className="mt-1 text-xs text-neutral-400 font-mono-tabular flex items-center gap-2.5">
              <span>{isOpen ? 'Open Now' : `Closed · Opens ${building.openHour}:00`}</span>
              <span>·</span>
              <span>
                Day {world.day}, {formatSimTime(world.minuteOfDay)}
              </span>
              <span>·</span>
              <span className="text-neutral-200">Credits ₵{Math.round(world.player.balance)}</span>
              <span>·</span>
              <span className="text-neutral-200">Energy {Math.round(world.player.energy)}%</span>
            </div>
            <p className="mt-2 text-xs text-neutral-300 leading-relaxed">{building.description}</p>
          </div>
          <button
            type="button"
            aria-label={`Close ${building.name}`}
            onClick={onClose}
            className="w-8 h-8 rounded border border-neutral-700 hover:border-neutral-400 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {feedback && (
            <div
              role="status"
              className={`px-3.5 py-2.5 rounded-md border text-xs ${
                feedback.ok
                  ? 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-950/35 text-amber-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {!isOpen && !isResidential && (
            <div className="p-4 rounded-md border border-neutral-800 bg-neutral-900/60 text-sm text-neutral-300">
              {building.name} is currently closed. Business hours are {building.openHour}:00 to{' '}
              {building.closeHour}:00. You can rest until morning at Cedar Row North.
            </div>
          )}

          {/* Employment Section */}
          {isOpen && localJobs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Briefcase className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Simulated Employment Shifts
                </h3>
              </div>
              <div className="space-y-2.5">
                {localJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-md border border-neutral-800 flex items-center justify-between gap-4"
                    style={{ backgroundColor: '#151a24' }}
                  >
                    <div>
                      <div className="font-display text-sm font-semibold text-neutral-100">
                        {job.title}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{job.description}</p>
                      <div className="mt-1.5 text-xs font-mono-tabular text-neutral-300 flex flex-wrap gap-x-3">
                        <span style={{ color: accent }}>Base Pay ₵{job.basePay}+</span>
                        <span>{job.durationMinutes} min</span>
                        <span>-{job.energyCost}% Energy</span>
                        <span>+{job.skillGain} {job.skillTrained}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onWorkJob(job.id)}
                      className="px-4 py-2 rounded-md font-display text-xs font-semibold text-neutral-950 cursor-pointer whitespace-nowrap shrink-0"
                      style={{ backgroundColor: accent }}
                    >
                      Work Shift
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Goods & Purchases Section */}
          {isOpen && localItems.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
                  <h3 className="font-display text-sm font-semibold text-white">
                    Local Goods & Supplies
                  </h3>
                </div>
                <span className="text-xs font-mono-tabular text-neutral-400">
                  Demand Index {world.economyDemandIndex.toFixed(2)}x
                </span>
              </div>
              <div className="space-y-2.5">
                {localItems.map((item) => {
                  const price = getAdjustedItemPrice(item, world.economyDemandIndex);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-md border border-neutral-800 flex items-center justify-between gap-4"
                      style={{ backgroundColor: '#151a24' }}
                    >
                      <div>
                        <div className="font-display text-sm font-semibold text-neutral-100">
                          {item.name}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>
                        <div className="mt-1.5 text-xs font-mono-tabular text-neutral-300 flex gap-3">
                          {item.energyRestore > 0 && <span>+{item.energyRestore}% Energy</span>}
                          {item.skillBoost && (
                            <span>
                              +{item.skillBoost.amount} {item.skillBoost.skill}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onBuyItem(item.id)}
                        className="px-4 py-2 rounded-md font-mono-tabular text-xs font-semibold text-white border border-neutral-600 hover:border-white cursor-pointer whitespace-nowrap shrink-0"
                        style={{ backgroundColor: '#1d2432' }}
                      >
                        Buy ₵{price}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Residential Overnight Rest */}
          {isResidential && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Moon className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Rest & Advance to Next Day
                </h3>
              </div>
              <div
                className="p-4 rounded-md border border-neutral-800 flex items-center justify-between gap-4"
                style={{ backgroundColor: '#151a24' }}
              >
                <div>
                  <div className="font-display text-sm font-semibold text-white">
                    Sleep Until Day {world.day + 1}, 07:30 AM
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Restores avatar energy to 100%, settles daily land yields, and lets neighborhood
                    residents progress into tomorrow while retaining memories of today.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRestNextMorning}
                  className="px-4 py-2.5 rounded-md font-display text-xs font-semibold text-neutral-950 cursor-pointer whitespace-nowrap shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  Rest Until Dawn
                </button>
              </div>
            </section>
          )}

          {/* Clinic Wellness Recharge */}
          {isClinic && isOpen && (
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Avatar Diagnostics & Wellness
                </h3>
              </div>
              <div
                className="p-4 rounded-md border border-neutral-800 flex items-center justify-between gap-4"
                style={{ backgroundColor: '#151a24' }}
              >
                <div>
                  <div className="font-display text-sm font-semibold text-white">
                    Full Physical Restoration
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Recharges avatar stamina to 100% without advancing the clock to tomorrow.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClinicRecharge}
                  className="px-4 py-2 rounded-md font-mono-tabular text-xs font-semibold text-neutral-950 cursor-pointer whitespace-nowrap shrink-0"
                  style={{ backgroundColor: accent }}
                >
                  Restore ₵15
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
