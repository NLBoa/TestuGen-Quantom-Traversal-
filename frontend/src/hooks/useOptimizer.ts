import { useState } from 'react';
import type { Schedule, OptimizationRequest } from '../types';
import { optimize } from '../api/client';

export function useOptimizer() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleLabels, setScheduleLabels] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<{ numVariables: number; solver: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function runOptimize(request: OptimizationRequest) {
    setStatus('loading');
    setError('');
    setWarnings([]);
    try {
      const response = await optimize(request);
      setSchedules(response.schedules);
      setScheduleLabels(response.schedules.map((_, i) => i + 1));
      setMeta({ numVariables: response.num_variables, solver: response.solver_used });
      setWarnings(response.warnings || []);
      setSelectedIndex(0);
      setStatus(response.schedules.length > 0 ? 'done' : 'error');
      if (response.schedules.length === 0) {
        setError('No valid schedules found. Try different courses or fewer constraints.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed');
      setStatus('error');
    }
  }

  function removeSchedule(index: number) {
    setSchedules(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setStatus('idle');
        setMeta(null);
      }
      return next;
    });
    setScheduleLabels(prev => prev.filter((_, i) => i !== index));
    setSelectedIndex(prev => {
      if (index < prev) return prev - 1;
      if (index === prev) return 0;
      return prev;
    });
  }

  function reset() {
    setStatus('idle');
    setSchedules([]);
    setScheduleLabels([]);
    setSelectedIndex(0);
    setError('');
    setWarnings([]);
    setMeta(null);
  }

  return { status, schedules, scheduleLabels, selectedIndex, setSelectedIndex, error, warnings, meta, runOptimize, reset, removeSchedule };
}
