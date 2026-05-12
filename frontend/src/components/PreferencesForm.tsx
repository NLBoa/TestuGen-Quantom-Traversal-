import React from 'react';
import { DAY_ORDER } from '../utils/timeUtils';

interface Props {
  noEarlyMorning: boolean;
  setNoEarlyMorning: (v: boolean) => void;
  noEvening: boolean;
  setNoEvening: (v: boolean) => void;
  lunchBreak: boolean;
  setLunchBreak: (v: boolean) => void;
  earlyBefore: number;
  setEarlyBefore: (v: number) => void;
  eveningAfter: number;
  setEveningAfter: (v: number) => void;
  lunchStartHour: number;
  setLunchStartHour: (v: number) => void;
  lunchEndHour: number;
  setLunchEndHour: (v: number) => void;
  minGap: number | null;
  setMinGap: (v: number | null) => void;
  maxGap: number | null;
  setMaxGap: (v: number | null) => void;
  profWeight: number;
  setProfWeight: (v: number) => void;
  gapWeight: number;
  setGapWeight: (v: number) => void;
  timeWeight: number;
  setTimeWeight: (v: number) => void;
  blockedSlots: Set<string>;
  toggleBlocked: (key: string) => void;
  autoBlockedSlots: Set<string>;
  solver: string;
  setSolver: (v: string) => void;
  semester: string;
  setSemester: (v: string) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i); // 8am to 9pm

function formatHour(h: number): string {
  if (h === 0 || h === 12) return '12';
  return h > 12 ? `${h - 12}` : `${h}`;
}

function formatHourLabel(h: number): string {
  return `${formatHour(h)} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Generate hour options for dropdowns
function hourOptions(min: number, max: number) {
  const opts = [];
  for (let h = min; h <= max; h++) {
    opts.push({ value: h, label: formatHourLabel(h) });
  }
  return opts;
}

export function PreferencesForm(props: Props) {
  const {
    noEarlyMorning, setNoEarlyMorning,
    noEvening, setNoEvening,
    lunchBreak, setLunchBreak,
    earlyBefore, setEarlyBefore,
    eveningAfter, setEveningAfter,
    lunchStartHour, setLunchStartHour,
    lunchEndHour, setLunchEndHour,
    minGap, setMinGap,
    maxGap, setMaxGap,
    profWeight, setProfWeight,
    gapWeight, setGapWeight,
    timeWeight, setTimeWeight,
    blockedSlots, toggleBlocked,
    autoBlockedSlots,
    solver, setSolver,
    semester, setSemester,
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Semester</label>
        <select
          value={semester}
          onChange={e => setSemester(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="202608">Fall 2026</option>
          <option value="202601">Spring 2026</option>
          <option value="202508">Fall 2025</option>
          <option value="202501">Spring 2025</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Block Out Times</label>
        <div className="flex gap-3 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-red-900/70 inline-block"></span> Manual
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-amber-900/70 inline-block"></span> From filters
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-6 gap-px bg-gray-700 rounded-lg overflow-hidden" style={{ minWidth: '320px' }}>
            <div className="bg-gray-900 p-1 text-center text-xs text-gray-500"></div>
            {DAY_ORDER.map(day => (
              <div key={day} className="bg-gray-900 p-1 text-center text-xs font-medium text-gray-400">
                {day}
              </div>
            ))}
            {HOURS.map(hour => (
              <React.Fragment key={`row-${hour}`}>
                <div className="bg-gray-900 p-1 text-center text-xs text-gray-500">
                  {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}
                </div>
                {DAY_ORDER.map(day => {
                  const key = `${day}-${hour}`;
                  const isManual = blockedSlots.has(key);
                  const isAuto = autoBlockedSlots.has(key);
                  const isBlocked = isManual || isAuto;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleBlocked(key)}
                      className={`p-1 text-xs transition-colors ${
                        isManual && isAuto
                          ? 'bg-amber-900/70 hover:bg-amber-800'
                          : isAuto
                          ? 'bg-amber-900/50 hover:bg-amber-800/60'
                          : isManual
                          ? 'bg-red-900/70 hover:bg-red-800'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Early morning filter */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noEarlyMorning}
              onChange={e => setNoEarlyMorning(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-gray-300">Avoid early morning</span>
          </label>
          {noEarlyMorning && (
            <div className="mt-2 ml-7 flex items-center gap-2">
              <span className="text-xs text-gray-400">Before</span>
              <select
                value={earlyBefore}
                onChange={e => setEarlyBefore(Number(e.target.value))}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {hourOptions(8, 12).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Evening filter */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noEvening}
              onChange={e => setNoEvening(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-gray-300">Avoid evening</span>
          </label>
          {noEvening && (
            <div className="mt-2 ml-7 flex items-center gap-2">
              <span className="text-xs text-gray-400">After</span>
              <select
                value={eveningAfter}
                onChange={e => setEveningAfter(Number(e.target.value))}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {hourOptions(15, 21).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Lunch filter */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={lunchBreak}
              onChange={e => setLunchBreak(e.target.checked)}
              className="w-4 h-4 accent-red-500"
            />
            <span className="text-sm text-gray-300">Keep lunch free</span>
          </label>
          {lunchBreak && (
            <div className="mt-2 ml-7 flex items-center gap-2">
              <select
                value={lunchStartHour}
                onChange={e => {
                  const v = Number(e.target.value);
                  setLunchStartHour(v);
                  if (v >= lunchEndHour) setLunchEndHour(v + 1);
                }}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {hourOptions(10, 15).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">to</span>
              <select
                value={lunchEndHour}
                onChange={e => setLunchEndHour(Number(e.target.value))}
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {hourOptions(lunchStartHour + 1, 16).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Gap between classes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Time Between Classes</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-gray-400 block mb-1">Minimum gap</span>
            <select
              value={minGap ?? 'none'}
              onChange={e => setMinGap(e.target.value === 'none' ? null : Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="none">None</option>
              <option value="10">10 min</option>
              <option value="15">15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
            </select>
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-1">Maximum gap</span>
            <select
              value={maxGap ?? 'none'}
              onChange={e => setMaxGap(e.target.value === 'none' ? null : Number(e.target.value))}
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="none">None</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Priority Weights</label>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Professor Rating</span>
              <span>{Math.round(profWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0" max="100" value={profWeight * 100}
              onChange={e => setProfWeight(Number(e.target.value) / 100)}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Class Gap Preference</span>
              <span>{Math.round(gapWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0" max="100" value={gapWeight * 100}
              onChange={e => setGapWeight(Number(e.target.value) / 100)}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Time Preferences</span>
              <span>{Math.round(timeWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0" max="100" value={timeWeight * 100}
              onChange={e => setTimeWeight(Number(e.target.value) / 100)}
              className="w-full accent-red-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Solver</label>
        <div className="flex gap-3">
          {(['qaoa', 'classical', 'both'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSolver(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                solver === s
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s === 'qaoa' ? 'QAOA' : s === 'classical' ? 'Classical' : 'Both'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
