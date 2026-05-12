import type { CourseResult, OptimizationRequest, OptimizationResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export async function searchCourses(query: string): Promise<CourseResult[]> {
  if (!query || query.length < 2) return [];
  const res = await fetch(`${API_BASE}/courses/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProfessors(courseId: string, _semester?: string): Promise<string[]> {
  try {
    // Hit Jupiterp directly — much faster than backend sections endpoint
    // (skips umd.io + PlanetTerp rating lookups we don't need here)
    const res = await fetch(
      `https://api.jupiterp.com/v0/sections?courseCodes=${encodeURIComponent(courseId.toUpperCase())}`
    );
    if (!res.ok) return [];
    const sections: Array<{ instructors?: string[] }> = await res.json();
    const profs = new Set<string>();
    for (const sec of sections) {
      for (const instr of sec.instructors || []) {
        if (instr && instr !== 'Instructor: TBA') profs.add(instr);
      }
    }
    return [...profs].sort();
  } catch {
    return [];
  }
}

export async function optimize(request: OptimizationRequest): Promise<OptimizationResponse> {
  const res = await fetch(`${API_BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Optimization failed' }));
    throw new Error(err.detail || 'Optimization failed');
  }
  return res.json();
}
