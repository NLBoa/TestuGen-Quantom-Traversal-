import { useState, useCallback, useMemo } from 'react';
import type { CourseResult, OptimizationRequest, BlockedSlot } from './types';
import { CourseSearch } from './components/CourseSearch';
import { PreferencesForm } from './components/PreferencesForm';
import { WeeklyCalendar } from './components/WeeklyCalendar';
import { ScheduleResults } from './components/ScheduleResults';
import { useOptimizer } from './hooks/useOptimizer';
import { DAY_ORDER } from './utils/timeUtils';

function App() {
  const [selectedCourses, setSelectedCourses] = useState<CourseResult[]>([]);
  const [professorPrefs, setProfessorPrefs] = useState<Record<string, string>>({});
  const [semester, setSemester] = useState('202608');
  const [noEarlyMorning, setNoEarlyMorning] = useState(true);
  const [noEvening, setNoEvening] = useState(false);
  const [lunchBreak, setLunchBreak] = useState(true);
  const [earlyBefore, setEarlyBefore] = useState(9);
  const [eveningAfter, setEveningAfter] = useState(17);
  const [lunchStartHour, setLunchStartHour] = useState(11);
  const [lunchEndHour, setLunchEndHour] = useState(13);
  const [minGap, setMinGap] = useState<number | null>(null);
  const [maxGap, setMaxGap] = useState<number | null>(null);
  const [profWeight, setProfWeight] = useState(0.4);
  const [gapWeight, setGapWeight] = useState(0.3);
  const [timeWeight, setTimeWeight] = useState(0.3);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [solver, setSolver] = useState('qaoa');

  // Auto-blocked slots computed from checkbox filters
  const autoBlockedSlots = useMemo(() => {
    const auto = new Set<string>();
    DAY_ORDER.forEach(day => {
      if (noEarlyMorning) {
        for (let h = 8; h < earlyBefore; h++) auto.add(`${day}-${h}`);
      }
      if (noEvening) {
        for (let h = eveningAfter; h <= 21; h++) auto.add(`${day}-${h}`);
      }
      if (lunchBreak) {
        for (let h = lunchStartHour; h < lunchEndHour; h++) auto.add(`${day}-${h}`);
      }
    });
    return auto;
  }, [noEarlyMorning, noEvening, lunchBreak, earlyBefore, eveningAfter, lunchStartHour, lunchEndHour]);

  // Merged set for API requests
  const allBlockedSlots = useMemo(() => {
    const merged = new Set(blockedSlots);
    autoBlockedSlots.forEach(s => merged.add(s));
    return merged;
  }, [blockedSlots, autoBlockedSlots]);

  const { status, schedules, selectedIndex, setSelectedIndex, error, warnings, meta, runOptimize } = useOptimizer();

  const handleAddCourse = useCallback((course: CourseResult) => {
    setSelectedCourses(prev => {
      if (prev.some(c => c.course_id === course.course_id)) return prev;
      return [...prev, course];
    });
  }, []);

  const handleRemoveCourse = useCallback((courseId: string) => {
    setSelectedCourses(prev => prev.filter(c => c.course_id !== courseId));
    setProfessorPrefs(prev => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });
  }, []);

  const handleProfessorChange = useCallback((courseId: string, professor: string) => {
    setProfessorPrefs(prev => {
      if (!professor) {
        const next = { ...prev };
        delete next[courseId];
        return next;
      }
      return { ...prev, [courseId]: professor };
    });
  }, []);

  const toggleBlocked = useCallback((key: string) => {
    setBlockedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  function handleOptimize() {
    if (selectedCourses.length === 0) return;

    const blocked_times: BlockedSlot[] = [];
    allBlockedSlots.forEach(key => {
      const [day, hourStr] = key.split('-');
      const hour = parseInt(hourStr);
      blocked_times.push({
        day,
        start: `${hour}:00`,
        end: `${hour + 1}:00`,
      });
    });

    const total = profWeight + gapWeight + timeWeight || 1;

    const request: OptimizationRequest = {
      course_ids: selectedCourses.map(c => c.course_id),
      semester,
      professor_prefs: professorPrefs,
      preferences: {
        blocked_times,
        lunch_window: lunchBreak ? [`${lunchStartHour}:00`, `${lunchEndHour}:00`] : null,
        no_early_morning: noEarlyMorning,
        no_evening: noEvening,
        min_gap: minGap,
        max_gap: maxGap,
      },
      weights: {
        professor_rating: profWeight / total,
        gap_preference: gapWeight / total,
        time_preference: timeWeight / total,
      },
      num_results: 5,
      solver,
    };

    runOptimize(request);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-sm">T</div>
          <div>
            <h1 className="text-xl font-bold">TerpScheduler</h1>
            <p className="text-xs text-gray-500">Quantum-Optimized Course Scheduling for UMD</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <CourseSearch
                selectedCourses={selectedCourses}
                onAdd={handleAddCourse}
                onRemove={handleRemoveCourse}
                professorPrefs={professorPrefs}
                onProfessorChange={handleProfessorChange}
                semester={semester}
              />
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-base font-semibold mb-4">Preferences</h2>
              <PreferencesForm
                noEarlyMorning={noEarlyMorning} setNoEarlyMorning={setNoEarlyMorning}
                noEvening={noEvening} setNoEvening={setNoEvening}
                lunchBreak={lunchBreak} setLunchBreak={setLunchBreak}
                earlyBefore={earlyBefore} setEarlyBefore={setEarlyBefore}
                eveningAfter={eveningAfter} setEveningAfter={setEveningAfter}
                lunchStartHour={lunchStartHour} setLunchStartHour={setLunchStartHour}
                lunchEndHour={lunchEndHour} setLunchEndHour={setLunchEndHour}
                minGap={minGap} setMinGap={setMinGap}
                maxGap={maxGap} setMaxGap={setMaxGap}
                profWeight={profWeight} setProfWeight={setProfWeight}
                gapWeight={gapWeight} setGapWeight={setGapWeight}
                timeWeight={timeWeight} setTimeWeight={setTimeWeight}
                blockedSlots={blockedSlots} toggleBlocked={toggleBlocked}
                autoBlockedSlots={autoBlockedSlots}
                solver={solver} setSolver={setSolver}
                semester={semester} setSemester={setSemester}
              />
            </div>

            <button
              onClick={handleOptimize}
              disabled={selectedCourses.length === 0 || status === 'loading'}
              className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Optimizing...
                </>
              ) : (
                'Optimize Schedule'
              )}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-sm text-yellow-300">
                {warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            )}

            <ScheduleResults
              schedules={schedules}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              meta={meta}
            />
          </div>

          <div>
            <WeeklyCalendar schedule={schedules[selectedIndex] ?? null} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
