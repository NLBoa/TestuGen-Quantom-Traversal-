from __future__ import annotations
import itertools
from collections import defaultdict

import numpy as np

from .. import config
from .models import Section, VariableMapping, ScheduleResult
from .qubo import sections_conflict


def _evaluate(Q: np.ndarray, bitstring: list[int]) -> float:
    x = np.array(bitstring, dtype=np.float64)
    with np.errstate(all='ignore'):
        result = float(x @ Q @ x)
    if not np.isfinite(result):
        return 1e12
    return result


def _build_bitstring(sections: list[Section], all_sections: list[Section]) -> list[int]:
    """Build a bitstring from selected sections."""
    selected_ids = {s.section_id for s in sections}
    return [1 if s.section_id in selected_ids else 0 for s in all_sections]


def _has_conflict(sections: list[Section]) -> bool:
    """Check if any pair of sections conflicts."""
    for i in range(len(sections)):
        for j in range(i + 1, len(sections)):
            if sections_conflict(sections[i], sections[j]):
                return True
    return False


def brute_force_solve(
    Q: np.ndarray,
    sections: list[Section],
    variable_map: list[VariableMapping],
    course_ids: list[str],
    num_results: int = 5,
) -> list[ScheduleResult]:
    """Smart enumeration: cartesian product of sections per course.
    With 6 courses × 5 sections each = 5^6 = 15,625 combos (vs 2^30 = 1B for naive).
    """
    # Group sections by course
    course_sections: dict[str, list[Section]] = defaultdict(list)
    for s in sections:
        course_sections[s.course_id].append(s)

    # Need sections for all requested courses
    course_lists = []
    for cid in course_ids:
        secs = course_sections.get(cid, [])
        if not secs:
            return []  # missing course — no valid schedule
        course_lists.append(secs)

    # Calculate total combos — if too many, use greedy
    total_combos = 1
    for cl in course_lists:
        total_combos *= len(cl)
        if total_combos > 500_000:
            return greedy_solve(Q, sections, course_ids, num_results)

    results: list[tuple[float, list[Section]]] = []

    for combo in itertools.product(*course_lists):
        combo_list = list(combo)
        if _has_conflict(combo_list):
            continue
        bits = _build_bitstring(combo_list, sections)
        energy = _evaluate(Q, bits)
        results.append((energy, combo_list))

    results.sort(key=lambda x: x[0])

    schedules = []
    for energy, selected in results[:num_results]:
        prof_score = sum(s.professor_rating for s in selected) / len(selected)
        bits = _build_bitstring(selected, sections)
        schedules.append(ScheduleResult(
            sections=selected,
            total_score=-energy,
            professor_score=prof_score,
            gap_score=0.0,
            time_score=0.0,
            solver="classical",
            bitstring="".join(str(b) for b in bits),
        ))

    return schedules


def greedy_solve(
    Q: np.ndarray,
    sections: list[Section],
    course_ids: list[str],
    num_results: int = 5,
) -> list[ScheduleResult]:
    """Backtracking solver with QUBO scoring. Used when cartesian product is too large."""
    course_sections: dict[str, list[Section]] = defaultdict(list)
    for s in sections:
        if s.course_id in course_ids:
            course_sections[s.course_id].append(s)

    # Sort courses by fewest sections first (prune faster)
    sorted_courses = sorted(course_ids, key=lambda c: len(course_sections.get(c, [])))

    results: list[tuple[float, list[Section]]] = []

    def _backtrack(idx: int, chosen: list[Section]) -> None:
        if len(results) >= num_results * 5:
            return
        if idx == len(sorted_courses):
            if len(chosen) == len(sorted_courses):
                bits = _build_bitstring(chosen, sections)
                energy = _evaluate(Q, bits)
                results.append((energy, list(chosen)))
            return

        cid = sorted_courses[idx]
        ranked = sorted(course_sections[cid], key=lambda s: -s.professor_rating)

        for sec in ranked:
            conflict = False
            for existing in chosen:
                if sections_conflict(sec, existing):
                    conflict = True
                    break
            if not conflict:
                chosen.append(sec)
                _backtrack(idx + 1, chosen)
                chosen.pop()

    _backtrack(0, [])
    results.sort(key=lambda x: x[0])

    schedules = []
    for energy, selected in results[:num_results]:
        prof_score = sum(s.professor_rating for s in selected) / len(selected)
        bits = _build_bitstring(selected, sections)
        schedules.append(ScheduleResult(
            sections=selected,
            total_score=-energy,
            professor_score=prof_score,
            gap_score=0.0,
            time_score=0.0,
            solver="classical",
            bitstring="".join(str(b) for b in bits),
        ))

    return schedules
