import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Schedule } from '../types';
import { parseDays, DAY_ORDER, COURSE_COLORS, minutesToTime } from '../utils/timeUtils';

// UMD College Park building coordinates [lat, lng, displayName]
const UMD_BUILDINGS: Record<string, [number, number, string]> = {
  MTH:   [38.9869, -76.9419, 'Mathematics'],
  CHM:   [38.9877, -76.9448, 'Chemistry'],
  CHEM:  [38.9877, -76.9448, 'Chemistry'],
  PHY:   [38.9857, -76.9428, 'Physics'],
  PHS:   [38.9857, -76.9428, 'Physics'],
  CSI:   [38.9892, -76.9432, 'Computer Science'],
  CSIC:  [38.9892, -76.9432, 'Computer Science'],
  AVW:   [38.9883, -76.9406, 'A.V. Williams'],
  KEB:   [38.9883, -76.9406, 'A.V. Williams'],
  EGR:   [38.9872, -76.9410, 'Engineering'],
  EGL:   [38.9872, -76.9410, 'Engineering Lab'],
  CHE:   [38.9859, -76.9408, 'Chemical & Nuclear Eng'],
  CEE:   [38.9871, -76.9403, 'Civil Engineering'],
  EME:   [38.9871, -76.9403, 'Engineering'],
  ESJ:   [38.9893, -76.9464, 'Edward St. John'],
  TYD:   [38.9876, -76.9462, 'Tydings Hall'],
  KEY:   [38.9873, -76.9474, 'Key Hall'],
  TWS:   [38.9887, -76.9467, 'Taliaferro Hall'],
  HBK:   [38.9863, -76.9455, 'Hornbake Library'],
  MCK:   [38.9862, -76.9470, 'McKeldin Library'],
  SPN:   [38.9880, -76.9459, 'Stamp Student Union'],
  JMS:   [38.9880, -76.9459, 'Stamp Student Union'],
  LFH:   [38.9858, -76.9490, 'LeFrak Hall'],
  VMH:   [38.9825, -76.9463, 'Van Munching Hall'],
  SYM:   [38.9844, -76.9467, 'Symons Hall'],
  ARS:   [38.9857, -76.9483, 'Art-Sociology'],
  ARC:   [38.9857, -76.9483, 'Art-Sociology'],
  SKN:   [38.9876, -76.9381, 'Skinner Hall'],
  HJP:   [38.9849, -76.9387, 'H.J. Patterson Hall'],
  BPS:   [38.9847, -76.9440, 'Biology-Psychology'],
  BIO:   [38.9847, -76.9440, 'Biology'],
  PSY:   [38.9847, -76.9440, 'Psychology'],
  GEO:   [38.9866, -76.9427, 'Geology'],
  IRB:   [38.9901, -76.9445, 'Interdisciplinary Research'],
  JMZ:   [38.9881, -76.9378, 'J.M. Patterson Bldg'],
  PLS:   [38.9842, -76.9393, 'Plant Sciences'],
  PFA:   [38.9876, -76.9494, 'Clarice Performing Arts'],
  PAC:   [38.9876, -76.9494, 'Clarice Performing Arts'],
  CSPAC: [38.9876, -76.9494, 'Clarice Performing Arts'],
  ARM:   [38.9845, -76.9459, 'Armory'],
  RCH:   [38.9845, -76.9459, 'Reckord Armory'],
  COL:   [38.9830, -76.9474, 'Cole Field House'],
  SHM:   [38.9858, -76.9452, 'Shoemaker Bldg'],
  NSL:   [38.9891, -76.9445, 'North Chemistry'],
  ESY:   [38.9862, -76.9392, 'Entomology Bldg'],
  AGR:   [38.9839, -76.9398, 'Agriculture'],
  FNS:   [38.9843, -76.9400, 'Food Sciences'],
  MOR:   [38.9862, -76.9484, 'Morrill Hall'],
  WDS:   [38.9887, -76.9477, 'Woods Hall'],
  BCC:   [38.9855, -76.9467, 'Benjamin Bldg'],
  EPR:   [38.9836, -76.9443, 'Eppley Recreation'],
  XFC:   [38.9834, -76.9450, 'Xfinity Center'],
  QAN:   [38.9872, -76.9432, 'Quantum-Anne Bldg'],
  NGH:   [38.9871, -76.9417, 'Neutral Ground'],
  RAM:   [38.9842, -76.9439, 'Regents Administration'],
  SSH:   [38.9866, -76.9462, 'South Campus Halls'],
  PER:   [38.9860, -76.9420, 'Perdue Hall'],
  ASY:   [38.9855, -76.9426, 'Astronomy'],
  OFC:   [38.9869, -76.9426, 'Main Administration'],
  ADM:   [38.9869, -76.9426, 'Administration'],
};

const UMD_CENTER: [number, number] = [38.9862, -76.9440];

const DAY_FULL: Record<string, string> = {
  M: 'Monday', Tu: 'Tuesday', W: 'Wednesday', Th: 'Thursday', F: 'Friday',
};
const DAY_SHORT: Record<string, string> = {
  M: 'Mon', Tu: 'Tue', W: 'Wed', Th: 'Thu', F: 'Fri',
};

interface Stop {
  course_id: string;
  section_id: string;
  instructor: string;
  building: string;
  room: string;
  start_time: number;
  end_time: number;
  color: string;
  coords: [number, number, string] | null;
}

function jitterDuplicates(stops: Stop[]): Array<Stop & { jittered: [number, number] }> {
  const seen: Record<string, number> = {};
  return stops.map(s => {
    if (!s.coords) return { ...s, jittered: [0, 0] as [number, number] };
    const key = `${s.coords[0]},${s.coords[1]}`;
    const count = seen[key] ?? 0;
    seen[key] = count + 1;
    const angle = (count * 2 * Math.PI) / 5;
    const offset = count === 0 ? 0 : 0.00012;
    return {
      ...s,
      jittered: [s.coords[0] + offset * Math.sin(angle), s.coords[1] + offset * Math.cos(angle)] as [number, number],
    };
  });
}

export function CampusMap({ schedule }: { schedule: Schedule | null }) {
  const [day, setDay] = useState('M');

  const courseColors = useMemo(() => {
    const m: Record<string, string> = {};
    if (!schedule) return m;
    [...new Set(schedule.sections.map(s => s.course_id))].forEach((cid, i) => {
      m[cid] = COURSE_COLORS[i % COURSE_COLORS.length];
    });
    return m;
  }, [schedule]);

  const activeDays = useMemo(() => {
    if (!schedule) return [] as string[];
    const set = new Set<string>();
    schedule.sections.forEach(s =>
      s.meetings.forEach(m => {
        if (m.start_time || m.end_time)
          parseDays(m.days || '').forEach(d => DAY_ORDER.includes(d) && set.add(d));
      })
    );
    return DAY_ORDER.filter(d => set.has(d));
  }, [schedule]);

  useEffect(() => {
    if (activeDays.length > 0 && !activeDays.includes(day)) setDay(activeDays[0]);
  }, [activeDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const stops = useMemo<Stop[]>(() => {
    if (!schedule) return [];
    return schedule.sections
      .flatMap(s =>
        s.meetings
          .filter(m => (m.start_time || m.end_time) && parseDays(m.days || '').includes(day))
          .map(m => ({
            course_id: s.course_id,
            section_id: s.section_id,
            instructor: s.instructors[0] || 'TBA',
            building: m.building || '',
            room: m.room || '',
            start_time: m.start_time,
            end_time: m.end_time,
            color: courseColors[s.course_id] || '#6B7280',
            coords: UMD_BUILDINGS[(m.building || '').toUpperCase()] ?? null,
          }))
      )
      .sort((a, b) => a.start_time - b.start_time);
  }, [schedule, day, courseColors]);

  if (!schedule) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Generate a schedule to see the campus map
      </div>
    );
  }

  if (activeDays.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">No in-person classes in this schedule</p>
      </div>
    );
  }

  const jittered = jitterDuplicates(stops);
  const routePoints: [number, number][] = jittered
    .filter(s => s.coords !== null)
    .map(s => s.jittered);

  const unknownBuildings = stops.filter(s => s.coords === null && s.building);

  return (
    <div className="h-full flex flex-col">
      {/* Day selector */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border-b border-gray-800">
        <span className="text-[11px] text-gray-500 mr-1 hidden sm:inline">Day:</span>
        {activeDays.map(d => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              d === day
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {DAY_SHORT[d]}
          </button>
        ))}
        {stops.length > 0 && (
          <span className="ml-auto text-[11px] text-gray-500 hidden sm:inline">
            {stops.length} class{stops.length !== 1 ? 'es' : ''} · {DAY_FULL[day]}
          </span>
        )}
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        {stops.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No in-person classes on {DAY_FULL[day]}
          </div>
        ) : (
          <>
            <MapContainer
              key={day}
              center={UMD_CENTER}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

              {/* Dashed route line between known buildings */}
              {routePoints.length > 1 && (
                <Polyline
                  positions={routePoints}
                  pathOptions={{ color: '#6B7280', weight: 2, dashArray: '6 8', opacity: 0.55 }}
                />
              )}

              {/* Class markers */}
              {jittered.map((stop, i) => {
                if (!stop.coords) return null;
                return (
                  <CircleMarker
                    key={`${stop.section_id}-${i}`}
                    center={stop.jittered}
                    radius={13}
                    pathOptions={{
                      fillColor: stop.color,
                      fillOpacity: 0.92,
                      color: '#fff',
                      weight: 2,
                    }}
                  >
                    <Tooltip permanent direction="top" offset={[0, -14]}>
                      <div style={{ fontWeight: 700, fontSize: 11, color: stop.color, whiteSpace: 'nowrap' }}>
                        {i + 1}. {stop.course_id}
                      </div>
                    </Tooltip>
                    <Tooltip direction="right" offset={[14, 0]} sticky={false}>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: stop.color }}>{stop.course_id}</div>
                        <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>
                          {minutesToTime(stop.start_time)} – {minutesToTime(stop.end_time)}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{stop.coords[2]}</div>
                        {stop.room && (
                          <div style={{ fontSize: 10, color: '#6b7280' }}>Room {stop.room}</div>
                        )}
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{stop.instructor}</div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Floating day schedule */}
            <div
              className="absolute bottom-3 left-3 z-[1000] bg-gray-950/95 border border-gray-700 rounded-xl shadow-2xl"
              style={{ maxWidth: 220, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }}
            >
              <div className="px-3 pt-2.5 pb-1 border-b border-gray-800">
                <p className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">{DAY_FULL[day]}</p>
              </div>
              <div className="p-2.5 space-y-2.5">
                {stops.map((stop, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div
                      className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: stop.color }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white leading-tight">{stop.course_id}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {minutesToTime(stop.start_time)} – {minutesToTime(stop.end_time)}
                      </p>
                      {stop.building && (
                        <p className="text-[10px] text-gray-500 leading-tight">
                          {stop.coords ? stop.coords[2] : stop.building} {stop.room && `·  ${stop.room}`}
                        </p>
                      )}
                      {!stop.coords && stop.building && (
                        <p className="text-[9px] text-yellow-600 leading-tight">not on map</p>
                      )}
                    </div>
                  </div>
                ))}
                {unknownBuildings.length > 0 && (
                  <p className="text-[9px] text-gray-600 pt-1 border-t border-gray-800">
                    {unknownBuildings.length} building{unknownBuildings.length > 1 ? 's' : ''} not in map data
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
