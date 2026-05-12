import type { Schedule } from '../types';

interface Props {
  schedules: Schedule[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  meta: { numVariables: number; solver: string } | null;
}

export function ScheduleResults({ schedules, selectedIndex, onSelect, meta }: Props) {
  if (schedules.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Results</h3>
        {meta && (
          <span className="text-xs text-gray-500">
            {meta.numVariables} sections evaluated &middot; {meta.solver.toUpperCase()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {schedules.map((schedule, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`text-left p-4 rounded-lg border transition-all ${
              i === selectedIndex
                ? 'bg-red-900/30 border-red-600'
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Schedule {i + 1}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                schedule.solver === 'qaoa'
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                  : 'bg-blue-900/50 text-blue-300 border border-blue-700'
              }`}>
                {schedule.solver === 'qaoa' ? 'QAOA' : 'Classical'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
              <span>Match: <span className="text-green-400 font-semibold">{schedule.total_score.toFixed(0)}%</span></span>
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>Prof <span className="text-yellow-400">★ {(schedule.professor_score / 20).toFixed(1)}</span></span>
              <span>Time <span className="text-blue-400">{schedule.time_score.toFixed(0)}%</span></span>
              <span>Gap <span className="text-emerald-400">{schedule.gap_score.toFixed(0)}%</span></span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {schedule.sections.map(s => (
                <span key={s.section_id} className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                  {s.section_id}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
