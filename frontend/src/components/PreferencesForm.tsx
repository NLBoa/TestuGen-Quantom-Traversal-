import React, { useState } from 'react';
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
}

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);

function formatHourLabel(h: number): string {
  const hour12 = h === 0 || h === 12 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12} ${h >= 12 ? 'PM' : 'AM'}`;
}

function hourOptions(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_, i) => ({
    value: min + i,
    label: formatHourLabel(min + i),
  }));
}

const sel = "px-2 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-red-500";

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
  } = props;

  const [showWeights, setShowWeights] = useState(false);

  return (
    <div className="space-y-4">
      {/* Section label */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filters</h3>

      {/* Time filters — each row always has fixed height to prevent layout shift */}
      <div className="space-y-2">
        {/* Early morning */}
        <div className="flex items-center justify-between gap-2 h-6">
          <label className="flex items-center gap-2 cursor-pointer min-w-0">
            <input type="checkbox" checked={noEarlyMorning} onChange={e => setNoEarlyMorning(e.target.checked)} className="w-3.5 h-3.5 accent-red-500 flex-shrink-0" />
            <span className="text-xs text-gray-300">No early morning</span>
          </label>
          <select
            value={earlyBefore}
            onChange={e => setEarlyBefore(Number(e.target.value))}
            disabled={!noEarlyMorning}
            className={`${sel} ${!noEarlyMorning ? 'opacity-0 pointer-events-none' : ''}`}
          >
            {hourOptions(8, 12).map(o => <option key={o.value} value={o.value}>before {o.label}</option>)}
          </select>
        </div>

        {/* Evening */}
        <div className="flex items-center justify-between gap-2 h-6">
          <label className="flex items-center gap-2 cursor-pointer min-w-0">
            <input type="checkbox" checked={noEvening} onChange={e => setNoEvening(e.target.checked)} className="w-3.5 h-3.5 accent-red-500 flex-shrink-0" />
            <span className="text-xs text-gray-300">No evening</span>
          </label>
          <select
            value={eveningAfter}
            onChange={e => setEveningAfter(Number(e.target.value))}
            disabled={!noEvening}
            className={`${sel} ${!noEvening ? 'opacity-0 pointer-events-none' : ''}`}
          >
            {hourOptions(15, 21).map(o => <option key={o.value} value={o.value}>after {o.label}</option>)}
          </select>
        </div>

        {/* Lunch */}
        <div className="flex items-center justify-between gap-2 h-6">
          <label className="flex items-center gap-2 cursor-pointer min-w-0">
            <input type="checkbox" checked={lunchBreak} onChange={e => setLunchBreak(e.target.checked)} className="w-3.5 h-3.5 accent-red-500 flex-shrink-0" />
            <span className="text-xs text-gray-300">Lunch break</span>
          </label>
          <span className={`flex items-center gap-1 flex-shrink-0 ${!lunchBreak ? 'opacity-0 pointer-events-none' : ''}`}>
            <select
              value={lunchStartHour}
              onChange={e => { const v = Number(e.target.value); setLunchStartHour(v); if (v >= lunchEndHour) setLunchEndHour(v + 1); }}
              disabled={!lunchBreak}
              className={sel}
            >
              {hourOptions(10, 15).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="text-[10px] text-gray-600">-</span>
            <select
              value={lunchEndHour}
              onChange={e => setLunchEndHour(Number(e.target.value))}
              disabled={!lunchBreak}
              className={sel}
            >
              {hourOptions(lunchStartHour + 1, 16).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </span>
        </div>
      </div>

      {/* Gap */}
      <div>
        <div className="text-xs text-gray-400 mb-1.5">Time between classes</div>
        <div className="flex items-center gap-2">
          <select value={minGap ?? 'none'} onChange={e => setMinGap(e.target.value === 'none' ? null : Number(e.target.value))} className={sel + ' flex-1'}>
            <option value="none">No min</option>
            <option value="10">10m+</option>
            <option value="15">15m+</option>
            <option value="20">20m+</option>
            <option value="30">30m+</option>
            <option value="45">45m+</option>
            <option value="60">1hr+</option>
          </select>
          <span className="text-[10px] text-gray-600">to</span>
          <select value={maxGap ?? 'none'} onChange={e => setMaxGap(e.target.value === 'none' ? null : Number(e.target.value))} className={sel + ' flex-1'}>
            <option value="none">No max</option>
            <option value="30">30m</option>
            <option value="60">1hr</option>
            <option value="90">1.5hr</option>
            <option value="120">2hr</option>
            <option value="180">3hr</option>
          </select>
        </div>
      </div>

      {/* Blocked time grid */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Block out times</span>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-sm bg-red-900/80 inline-block" /> Manual
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-sm bg-amber-800/80 inline-block" /> Auto
            </span>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-px bg-gray-700 rounded-md overflow-hidden">
          <div className="bg-gray-900 p-0.5" />
          {DAY_ORDER.map(day => (
            <div key={day} className="bg-gray-900 p-0.5 text-center text-[10px] font-medium text-gray-400">{day}</div>
          ))}
          {HOURS.map(hour => (
            <React.Fragment key={hour}>
              <div className="bg-gray-900 p-0.5 text-center text-[9px] text-gray-500 leading-tight">
                {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'p' : 'a'}
              </div>
              {DAY_ORDER.map(day => {
                const key = `${day}-${hour}`;
                const isManual = blockedSlots.has(key);
                const isAuto = autoBlockedSlots.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleBlocked(key)}
                    className={`h-4 transition-colors ${
                      isManual && isAuto ? 'bg-amber-900/70 hover:bg-amber-800'
                      : isAuto ? 'bg-amber-900/40 hover:bg-amber-800/50'
                      : isManual ? 'bg-red-900/60 hover:bg-red-800'
                      : 'bg-gray-800/80 hover:bg-gray-700'
                    }`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Priority weights — collapsible */}
      <div>
        <button
          onClick={() => setShowWeights(!showWeights)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform ${showWeights ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Priority weights
        </button>
        {showWeights && (
          <div className="mt-2 space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Professor Rating</span><span>{Math.round(profWeight * 100)}%</span>
              </div>
              <input type="range" min="0" max="100" value={profWeight * 100} onChange={e => setProfWeight(Number(e.target.value) / 100)} className="w-full accent-red-500 h-1" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Class Gap</span><span>{Math.round(gapWeight * 100)}%</span>
              </div>
              <input type="range" min="0" max="100" value={gapWeight * 100} onChange={e => setGapWeight(Number(e.target.value) / 100)} className="w-full accent-red-500 h-1" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Time Preferences</span><span>{Math.round(timeWeight * 100)}%</span>
              </div>
              <input type="range" min="0" max="100" value={timeWeight * 100} onChange={e => setTimeWeight(Number(e.target.value) / 100)} className="w-full accent-red-500 h-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
