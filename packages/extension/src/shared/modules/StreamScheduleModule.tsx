import type { StreamScheduleConfig } from '@creator-bio-hub/types';
import type { ModuleProps } from './types';

/** Display-only — no URL, no interaction tracking needed */
export function StreamScheduleModule({ module }: ModuleProps) {  // profileId unused — schedule is display-only
  const cfg = module.config as StreamScheduleConfig;

  if (!cfg.entries?.length) return null;

  return (
    <div className="stream-schedule">
      <div className="stream-schedule__label">{module.title}</div>
      <div className="schedule-block">
        {cfg.entries.map((entry, i) => (
          <div className="schedule-chip" key={i}>
            <span className="schedule-chip__day">{entry.day.slice(0, 3)}</span>
            <span className="schedule-chip__time">{entry.time}</span>
            {entry.label && (
              <span className="schedule-chip__label">{entry.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
