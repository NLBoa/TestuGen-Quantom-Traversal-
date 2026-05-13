import type { Schedule } from '../types';

interface Props {
  schedules: Schedule[];
  scheduleLabels: number[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  onRemove: (i: number) => void;
  meta: { numVariables: number; solver: string } | null;
}

export function ScheduleResults({ schedules, scheduleLabels, selectedIndex, onSelect, onRemove, meta }: Props) {
  if (schedules.length === 0) return null;

  const selected = schedules[selectedIndex];

  function handleRemove(e: React.MouseEvent, i: number) {
    e.stopPropagation();
    if (!window.confirm(`Remove Schedule ${scheduleLabels[i] ?? i + 1}?`)) return;
    onRemove(i);
  }

  return (
    <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/60 px-4 py-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        {/* Schedule tabs */}
        {schedules.map((schedule, i) => (
          <div
            key={i}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              i === selectedIndex
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <span>
              Schedule {scheduleLabels[i] ?? i + 1}
              <span className={`ml-1.5 ${i === selectedIndex ? 'text-red-200' : 'text-gray-500'}`}>
                {schedule.total_score.toFixed(0)}%
              </span>
            </span>
            <button
              onClick={(e) => handleRemove(e, i)}
              className={`ml-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] leading-none transition-colors ${
                i === selectedIndex
                  ? 'hover:bg-red-500 text-red-200'
                  : 'hover:bg-gray-600 text-gray-500'
              }`}
            >
              &times;
            </button>
          </div>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Selected schedule details */}
        {selected && (
          <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-shrink-0">
            <span>Prof <span className="text-yellow-400">★ {selected.avg_professor_rating.toFixed(1)}</span></span>
            {selected.pref_total_count > 0 && (
              <span className={selected.pref_match_count === selected.pref_total_count ? 'text-green-400' : 'text-orange-400'}>
                {selected.pref_match_count}/{selected.pref_total_count} pref
              </span>
            )}
            <span>Time <span className="text-blue-400">{selected.time_score.toFixed(0)}%</span></span>
            <span>Gap <span className="text-emerald-400">{selected.gap_score.toFixed(0)}%</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              selected.solver === 'qaoa'
                ? 'bg-purple-900/40 text-purple-400'
                : 'bg-blue-900/40 text-blue-400'
            }`}>
              {selected.solver === 'qaoa' ? 'QAOA' : 'Classical'}
            </span>
            {meta && (
              <span className="text-gray-600">{meta.numVariables} sections</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
