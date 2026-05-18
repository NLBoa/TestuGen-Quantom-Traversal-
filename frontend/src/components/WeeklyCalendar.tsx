import { useMemo, useState, useEffect } from 'react';
import type { Schedule, Section, Meeting } from '../types';
import { minutesToTime, parseDays, DAY_ORDER, COURSE_COLORS } from '../utils/timeUtils';

interface Props {
  schedule: Schedule | null;
  loading?: boolean;
  courseCount?: number;
}

const START_HOUR = 8;
const END_HOUR = 22;

const DAY_LABELS_FULL: Record<string, string> = { M: 'Mon', Tu: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri', Other: 'Other' };
const DAY_LABELS_SHORT: Record<string, string> = { M: 'M', Tu: 'T', W: 'W', Th: 'R', F: 'F', Other: '~' };

/** A meeting is async if it has no days or zero start/end time */
function isAsyncMeeting(m: Meeting): boolean {
  return !m.days || m.days.trim() === '' || (m.start_time === 0 && m.end_time === 0);
}

/** Check if a section is fully async (all meetings async) */
function isAsyncSection(s: Section): boolean {
  return s.meetings.length > 0 && s.meetings.every(isAsyncMeeting);
}

// Skeleton block templates — realistic UMD schedule patterns
const SKELETON_TEMPLATES = [
  { days: ['M', 'W', 'F'], start: 540, duration: 50 },
  { days: ['M', 'W', 'F'], start: 600, duration: 50 },
  { days: ['M', 'W', 'F'], start: 660, duration: 50 },
  { days: ['M', 'W', 'F'], start: 780, duration: 50 },
  { days: ['M', 'W', 'F'], start: 840, duration: 50 },
  { days: ['Tu', 'Th'], start: 570, duration: 75 },
  { days: ['Tu', 'Th'], start: 690, duration: 75 },
  { days: ['Tu', 'Th'], start: 810, duration: 75 },
  { days: ['Tu', 'Th'], start: 930, duration: 75 },
];

function generateSkeletonBlocks(courseCount: number) {
  const blocks: { day: string; start: number; duration: number; colorIdx: number }[] = [];
  let mwfIdx = 0;
  let tuthIdx = 5;

  for (let c = 0; c < Math.min(courseCount, 8); c++) {
    const template = c % 2 === 0
      ? SKELETON_TEMPLATES[mwfIdx++ % 5]
      : SKELETON_TEMPLATES[tuthIdx++ < 9 ? tuthIdx - 1 : 5 + ((tuthIdx - 5) % 4)];

    if (!template) continue;

    for (const day of template.days) {
      blocks.push({ day, start: template.start, duration: template.duration, colorIdx: c });
    }
  }
  return blocks;
}

function CalendarGrid({ hourHeight, timeColWidth, hasOtherCol, children, otherContent }: {
  hourHeight: number;
  timeColWidth: number;
  hasOtherCol: boolean;
  children?: (day: string) => React.ReactNode;
  otherContent?: React.ReactNode;
}) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const dayCols = hasOtherCol ? 6 : 5;
  const columns = hasOtherCol ? [...DAY_ORDER, 'Other'] : DAY_ORDER;

  return (
    <div className="h-full min-w-0">
      {/* Day headers */}
      <div
        className="grid border-b border-gray-800 sticky top-0 bg-gray-950 z-10"
        style={{ gridTemplateColumns: `${timeColWidth}px repeat(${dayCols}, 1fr)` }}
      >
        <div />
        {columns.map(day => (
          <div key={day} className={`py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-medium border-l border-gray-800 ${day === 'Other' ? 'text-gray-500 bg-gray-900/40' : 'text-gray-400'}`}>
            <span className="hidden sm:inline">{DAY_LABELS_FULL[day]}</span>
            <span className="sm:hidden">{DAY_LABELS_SHORT[day]}</span>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `${timeColWidth}px repeat(${dayCols}, 1fr)`, height: `${hours.length * hourHeight}px` }}
      >
        {/* Hour labels */}
        <div className="relative">
          {hours.map(h => (
            <div
              key={h}
              className="absolute w-full text-right pr-1 sm:pr-2 text-[8px] sm:text-[10px] text-gray-600"
              style={{ top: `${(h - START_HOUR) * hourHeight}px`, height: hourHeight }}
            >
              {h > 12 ? h - 12 : h}<span className="hidden sm:inline">{h >= 12 ? ' PM' : ' AM'}</span><span className="sm:hidden">{h >= 12 ? 'p' : 'a'}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAY_ORDER.map(day => (
          <div key={day} className="relative border-l border-gray-800/60">
            {hours.map(h => (
              <div
                key={h}
                className="absolute w-full border-t border-gray-800/40"
                style={{ top: `${(h - START_HOUR) * hourHeight}px`, height: hourHeight }}
              />
            ))}
            {children?.(day)}
          </div>
        ))}

        {/* Other column for async */}
        {hasOtherCol && (
          <div className="relative border-l border-gray-800/60 bg-gray-900/20">
            {hours.map(h => (
              <div
                key={h}
                className="absolute w-full border-t border-gray-800/20"
                style={{ top: `${(h - START_HOUR) * hourHeight}px`, height: hourHeight }}
              />
            ))}
            {otherContent}
          </div>
        )}
      </div>
    </div>
  );
}

export function WeeklyCalendar({ schedule, loading = false, courseCount = 4 }: Props) {
  const hourHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 40 : 56;
  const timeColWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 32 : 50;

  const skeletonBlocks = useMemo(
    () => generateSkeletonBlocks(courseCount),
    [courseCount]
  );

  // Elapsed timer for loading messages
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [loading]);

  // Skeleton loading state
  if (loading) {
    const loadingMessage =
      elapsed < 5  ? 'Fetching course sections...' :
      elapsed < 15 ? 'Gathering professor ratings...' :
      elapsed < 30 ? 'Running quantum optimization...' :
      elapsed < 60 ? 'This can take a minute — finding the best schedules...' :
                      'Almost there — hang tight, optimizing across all sections...';

    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 flex items-center gap-3">
          <div className="relative w-5 h-5 flex-shrink-0">
            <svg className="animate-spin w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 font-medium truncate">{loadingMessage}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`} elapsed
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <CalendarGrid hourHeight={hourHeight} timeColWidth={timeColWidth} hasOtherCol={false}>
            {(day) => (
              <>
                {skeletonBlocks
                  .filter(b => b.day === day)
                  .map((block, i) => {
                    const top = ((block.start - START_HOUR * 60) / 60) * hourHeight;
                    const height = (block.duration / 60) * hourHeight;
                    return (
                      <div
                        key={`skel-${day}-${i}`}
                        className="absolute left-0.5 right-0.5 rounded overflow-hidden"
                        style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
                      >
                        <div
                          className="w-full h-full rounded animate-pulse"
                          style={{
                            backgroundColor: COURSE_COLORS[block.colorIdx % COURSE_COLORS.length] + '15',
                            borderLeft: `3px solid ${COURSE_COLORS[block.colorIdx % COURSE_COLORS.length]}30`,
                          }}
                        >
                          <div className="p-1 sm:px-1.5 sm:py-1 space-y-1">
                            <div className="h-2.5 sm:h-3 rounded-sm w-3/4" style={{ backgroundColor: COURSE_COLORS[block.colorIdx % COURSE_COLORS.length] + '20' }} />
                            {height > 30 && (
                              <div className="h-2 rounded-sm w-1/2" style={{ backgroundColor: COURSE_COLORS[block.colorIdx % COURSE_COLORS.length] + '12' }} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </CalendarGrid>
        </div>
      </div>
    );
  }

  // Empty state
  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="max-w-sm text-center space-y-6">
          <div>
            <div className="w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Get Started</h2>
            <p className="text-gray-500 text-xs">Build your ideal schedule in a few steps</p>
          </div>
          <div className="space-y-3 text-left">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm text-gray-200 font-medium">Search for courses</p>
                <p className="text-xs text-gray-500">Type a course name or ID (e.g. CMSC216) in the search bar on the left</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-sm text-gray-200 font-medium">Set your preferences</p>
                <p className="text-xs text-gray-500">Pick preferred professors, block out times, and adjust filters</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-sm text-gray-200 font-medium">Click Optimize</p>
                <p className="text-xs text-gray-500">The app finds the best schedules based on professor ratings, time gaps, and your preferences</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <div>
                <p className="text-sm text-gray-200 font-medium">Compare and export</p>
                <p className="text-xs text-gray-500">Browse top schedules, then export to Google Calendar, Apple Calendar, or Outlook</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Real schedule — separate async vs timed sections
  const courseColors: Record<string, string> = {};
  const uniqueCourses = [...new Set(schedule.sections.map(s => s.course_id))];
  uniqueCourses.forEach((cid, i) => {
    courseColors[cid] = COURSE_COLORS[i % COURSE_COLORS.length];
  });

  // Collect async sections (all meetings have no days / zero times)
  const asyncSections = schedule.sections.filter(isAsyncSection);
  const hasOtherCol = asyncSections.length > 0;

  // For timed sections, also check for individual async meetings within a section
  // that has some timed meetings (rare but possible)

  const otherContent = hasOtherCol ? (
    <div className="absolute inset-0 p-0.5 space-y-1 overflow-y-auto">
      {asyncSections.map((section) => {
        const color = courseColors[section.course_id];
        const cardHeight = Math.max(hourHeight * 1.2, 65);
        return (
          <div
            key={`async-${section.section_id}`}
            className="relative rounded px-1 sm:px-1.5 py-1 overflow-hidden cursor-pointer group transition-all hover:brightness-125 hover:shadow-lg"
            style={{
              height: `${cardHeight}px`,
              backgroundColor: color + '25',
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div className="text-[9px] sm:text-[11px] font-semibold text-white truncate leading-tight">
              {section.course_id}
            </div>
            <div className="text-[8px] sm:text-[9px] text-gray-400 truncate leading-tight">
              {section.instructors[0] || 'TBA'}
            </div>
            <div className="text-[8px] sm:text-[9px] text-gray-500 truncate leading-tight uppercase">
              Online Async
            </div>
            <div className="text-[8px] sm:text-[9px] text-gray-500 truncate leading-tight">
              {section.section_id.split('-').pop()}
            </div>

            {/* Hover tooltip */}
            <div className="hidden md:group-hover:block absolute left-full top-0 ml-2 z-20 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl w-52 pointer-events-none">
              <div className="font-semibold text-white text-xs">{section.course_id} - {section.section_id.split('-')[1]}</div>
              <div className="text-xs text-gray-300 mt-1">{section.instructors.join(', ') || 'TBA'}</div>
              <div className="text-xs text-gray-400 mt-1">Online Asynchronous</div>
              <div className="flex gap-3 mt-2 text-[10px]">
                <span className="text-yellow-400">★ {section.professor_rating.toFixed(1)}</span>
                <span className="text-green-400">GPA: {section.avg_gpa.toFixed(2)}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Seats: {section.open_seats}/{section.total_seats}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : undefined;

  return (
    <CalendarGrid hourHeight={hourHeight} timeColWidth={timeColWidth} hasOtherCol={hasOtherCol} otherContent={otherContent}>
      {(day) => (
        <>
          {schedule.sections.map((section) =>
            section.meetings
              .filter(m => !isAsyncMeeting(m) && parseDays(m.days).includes(day))
              .map((meeting, midx) => {
                const top = ((meeting.start_time - START_HOUR * 60) / 60) * hourHeight;
                const height = ((meeting.end_time - meeting.start_time) / 60) * hourHeight;
                const color = courseColors[section.course_id];

                return (
                  <div
                    key={`${section.section_id}-${midx}`}
                    className="absolute left-0.5 right-0.5 rounded px-0.5 sm:px-1.5 py-0.5 overflow-hidden cursor-pointer group transition-all hover:z-10 hover:brightness-125 hover:shadow-lg"
                    style={{
                      top: `${top}px`,
                      height: `${Math.max(height, 20)}px`,
                      backgroundColor: color + '30',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div className="text-[9px] sm:text-[11px] font-semibold text-white truncate leading-tight">
                      {section.course_id}
                    </div>
                    {height > 25 && (
                      <div className="text-[8px] sm:text-[9px] text-gray-300 truncate leading-tight">
                        {section.section_id.split('-').pop()} · {meeting.building} {meeting.room}
                      </div>
                    )}
                    {height > 35 && section.instructors.length > 0 && (
                      <div className="hidden sm:block text-[9px] text-gray-400 truncate leading-tight">
                        {section.instructors[0]}
                      </div>
                    )}
                    {height > 48 && (
                      <div className="hidden sm:block text-[9px] text-gray-500 truncate leading-tight">
                        {minutesToTime(meeting.start_time)} - {minutesToTime(meeting.end_time)}
                      </div>
                    )}

                    {/* Hover tooltip — desktop only */}
                    <div className="hidden md:group-hover:block absolute left-full top-0 ml-2 z-20 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl w-52 pointer-events-none">
                      <div className="font-semibold text-white text-xs">{section.course_id} - {section.section_id.split('-')[1]}</div>
                      <div className="text-xs text-gray-300 mt-1">{section.instructors.join(', ')}</div>
                      <div className="text-xs text-gray-400 mt-1">{meeting.building} {meeting.room}</div>
                      <div className="text-xs text-gray-400">{minutesToTime(meeting.start_time)} - {minutesToTime(meeting.end_time)}</div>
                      <div className="flex gap-3 mt-2 text-[10px]">
                        <span className="text-yellow-400">★ {section.professor_rating.toFixed(1)}</span>
                        <span className="text-green-400">GPA: {section.avg_gpa.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Seats: {section.open_seats}/{section.total_seats}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </>
      )}
    </CalendarGrid>
  );
}
