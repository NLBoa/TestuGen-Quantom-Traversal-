import type { Schedule } from '../types';
import { minutesToTime, parseDays, DAY_ORDER, COURSE_COLORS } from '../utils/timeUtils';

interface Props {
  schedule: Schedule | null;
}

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;

export function WeeklyCalendar({ schedule }: Props) {
  if (!schedule) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        Add courses and click Optimize to see your schedule
      </div>
    );
  }

  const courseColors: Record<string, string> = {};
  const uniqueCourses = [...new Set(schedule.sections.map(s => s.course_id))];
  uniqueCourses.forEach((cid, i) => {
    courseColors[cid] = COURSE_COLORS[i % COURSE_COLORS.length];
  });

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="h-full">
      {/* Day headers */}
      <div className="grid grid-cols-[50px_repeat(5,1fr)] border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
        <div />
        {DAY_ORDER.map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-400 border-l border-gray-800">
            {day === 'M' ? 'Mon' : day === 'Tu' ? 'Tue' : day === 'W' ? 'Wed' : day === 'Th' ? 'Thu' : 'Fri'}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[50px_repeat(5,1fr)]" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
        {/* Hour labels */}
        <div className="relative">
          {hours.map(h => (
            <div
              key={h}
              className="absolute w-full text-right pr-2 text-[10px] text-gray-600"
              style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: HOUR_HEIGHT }}
            >
              {h > 12 ? h - 12 : h}{h >= 12 ? ' PM' : ' AM'}
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
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: HOUR_HEIGHT }}
              />
            ))}

            {schedule.sections.map((section) =>
              section.meetings
                .filter(m => parseDays(m.days).includes(day))
                .map((meeting, midx) => {
                  const top = ((meeting.start_time - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = ((meeting.end_time - meeting.start_time) / 60) * HOUR_HEIGHT;
                  const color = courseColors[section.course_id];

                  return (
                    <div
                      key={`${section.section_id}-${midx}`}
                      className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden cursor-pointer group transition-all hover:z-10 hover:brightness-125 hover:shadow-lg"
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height, 22)}px`,
                        backgroundColor: color + '30',
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      <div className="text-[11px] font-semibold text-white truncate leading-tight">
                        {section.course_id}
                      </div>
                      <div className="text-[9px] text-gray-300 truncate leading-tight">
                        {section.section_id.split('-').pop()} · {meeting.building} {meeting.room}
                      </div>
                      {height > 35 && section.instructors.length > 0 && (
                        <div className="text-[9px] text-gray-400 truncate leading-tight">
                          {section.instructors[0]}
                        </div>
                      )}
                      {height > 48 && (
                        <div className="text-[9px] text-gray-500 truncate leading-tight">
                          {minutesToTime(meeting.start_time)} - {minutesToTime(meeting.end_time)}
                        </div>
                      )}

                      {/* Hover tooltip */}
                      <div className="hidden group-hover:block absolute left-full top-0 ml-2 z-20 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl w-52 pointer-events-none">
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
          </div>
        ))}
      </div>
    </div>
  );
}
