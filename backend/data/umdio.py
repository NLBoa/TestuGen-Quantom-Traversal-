from __future__ import annotations
from typing import Any
import logging

import httpx

from .. import config
from .cache import cache
from .buildings import set_building_coords

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )
    return _client


async def _get(path: str, params: dict[str, Any] | None = None, retries: int = 1) -> Any:
    client = _get_client()
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = await client.get(f"{config.UMDIO_BASE}{path}", params=params)
            # Retry on server errors (500, 502, 503)
            if resp.status_code >= 500:
                logger.warning(f"umd.io {resp.status_code} (attempt {attempt+1}/{retries+1}): {path}")
                last_exc = httpx.HTTPStatusError(
                    f"Server error {resp.status_code}",
                    request=resp.request,
                    response=resp,
                )
                if attempt < retries:
                    import asyncio
                    await asyncio.sleep(0.5)
                    continue
                raise last_exc
            resp.raise_for_status()
            return resp.json()
        except (httpx.TimeoutException, httpx.ConnectError, httpx.PoolTimeout) as e:
            last_exc = e
            logger.warning(f"umd.io timeout (attempt {attempt+1}/{retries+1}): {path} - {e}")
            if attempt < retries:
                import asyncio
                await asyncio.sleep(0.5)
                continue
        except httpx.HTTPStatusError:
            raise
    raise last_exc or Exception("Unknown error")


async def search_courses(query: str = "", dept: str = "") -> list[dict]:
    params: dict[str, Any] = {}
    if dept:
        params["dept_id"] = dept

    try:
        courses = await _get("/courses", params=params)
    except Exception:
        courses = []

    if query:
        q = query.upper()
        courses = [c for c in courses if q in c.get("course_id", "").upper() or q in c.get("name", "").upper()]
    return courses


async def get_sections(course_id: str, semester: str) -> list[dict]:
    cache_key = f"sections:{course_id}:{semester}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    sections = []
    try:
        sections = await _get(f"/courses/{course_id}/sections", params={"semester": semester})
    except Exception as e:
        logger.warning(f"Failed to fetch sections for {course_id}: {e}")
        sections = []

    if sections:
        cache.set(cache_key, sections, config.CACHE_TTL_COURSES)
    return sections


NAME_TO_CODE = {
    "Brendan Iribe Center": "IRB",
    "A.V. Williams": "AVW",
    "Computer Science Instructional Center": "CSI",
}


async def get_all_buildings() -> dict[str, dict]:
    cache_key = "buildings:all"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        buildings_list = await _get("/map/buildings")
    except Exception:
        buildings_list = []

    result = {}
    for b in buildings_list:
        code = b.get("code", "")
        lat = b.get("lat")
        lng = b.get("long") or b.get("lng")

        if not lat or not lng:
            continue

        if code:
            result[code] = {"name": b.get("name", ""), "lat": lat, "lng": lng}
            set_building_coords(code, lat, lng)

        name = b.get("name", "")
        if name in NAME_TO_CODE:
            fallback_code = NAME_TO_CODE[name]
            if fallback_code not in result:
                result[fallback_code] = {"name": name, "lat": lat, "lng": lng}
                set_building_coords(fallback_code, lat, lng)

    cache.set(cache_key, result, config.CACHE_TTL_BUILDINGS)
    return result
