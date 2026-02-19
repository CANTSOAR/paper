import httpx
from typing import List, Dict, Any
from .adapter import MarketAdapter

KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2"

TARGET_RESULTS = 20
PAGE_SIZE = 1000
MAX_PAGES = 100


class KalshiAdapter(MarketAdapter):

    # ── Mock fallback ─────────────────────────────────────────────────
    MOCK_MARKETS = [
        {
            "id": "kalshi-1",
            "provider": "Kalshi",
            "title": "Will Coffee (KC) close above $2.50 in Dec?",
            "volume": "$142K",
            "yesPrice": "42¢",
            "noPrice": "58¢",
            "expiry": "Dec 12, 2026",
        },
        {
            "id": "kalshi-2",
            "provider": "Kalshi",
            "title": "Fed Interest Rate Cut in March",
            "volume": "$890K",
            "yesPrice": "65¢",
            "noPrice": "35¢",
            "expiry": "Mar 18, 2026",
        },
    ]

    # ── Helpers ───────────────────────────────────────────────────────
    @staticmethod
    def _fmt_cents(cents: int) -> str:
        if cents <= 0:
            return "—"
        return f"{cents}¢"

    @staticmethod
    def _fmt_volume(vol: int) -> str:
        if vol >= 1_000_000:
            return f"${vol / 1_000_000:.1f}M"
        if vol >= 1_000:
            return f"${vol / 1_000:.0f}K"
        return f"${vol}"

    @staticmethod
    def _fmt_expiry(iso: str) -> str:
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            return dt.strftime("%b %d, %Y")
        except Exception:
            return iso

    @staticmethod
    def _is_valid_market(m: dict) -> bool:
        if m.get("mve_collection_ticker"):
            return False
        title = m.get("title", "")
        if not title:
            return False
        if title.lower().startswith("yes "):
            return False
        if len(title) > 100:
            return False
        # Skip sports prop bets (goal scorers, fight rounds, etc.)
        t = title.lower()
        sports_signals = [
            "1+ goals", "2+ goals", "3+ goals",
            "fight in round", "win round",
            "total points", "total goals",
            "half-time", "halftime",
        ]
        if any(s in t for s in sports_signals):
            return False
        # Skip "Name: stat" pattern (common in sports props)
        if ": " in title and title.split(": ")[0].replace(" ", "").isalpha():
            parts = title.split(": ", 1)
            stat = parts[1].lower()
            if any(kw in stat for kw in ["goal", "assist", "point", "rebound", "yard", "touchdown", "strikeout"]):
                return False
        return True

    def _transform(self, m: dict) -> dict:
        return {
            "id": m.get("ticker", ""),
            "provider": "Kalshi",
            "title": m.get("title", ""),
            "volume": self._fmt_volume(m.get("volume", 0)),
            "yesPrice": self._fmt_cents(m.get("yes_bid", 0)),
            "noPrice": self._fmt_cents(m.get("no_bid", 0)),
            "expiry": self._fmt_expiry(m.get("expiration_time", "")),
        }

    # ── Public API ────────────────────────────────────────────────────
    def search_markets(self, query: str) -> List[Dict[str, Any]]:
        """Paginate through Kalshi markets until we find TARGET_RESULTS matches."""
        try:
            results: list = []
            cursor: str | None = None
            q_lower = query.lower() if query else ""

            for _ in range(MAX_PAGES):
                params: dict = {
                    "status": "open",
                    "limit": PAGE_SIZE,
                    "mve_filter": "exclude",
                }
                if cursor:
                    params["cursor"] = cursor

                resp = httpx.get(
                    f"{KALSHI_BASE}/markets",
                    params=params,
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                raw_markets = data.get("markets", [])

                for m in raw_markets:
                    if not self._is_valid_market(m):
                        continue
                    if q_lower and q_lower not in m.get("title", "").lower():
                        continue
                    results.append(self._transform(m))
                    if len(results) >= TARGET_RESULTS:
                        return results

                # Advance cursor; stop if no more pages
                cursor = data.get("cursor")
                if not cursor or len(raw_markets) < PAGE_SIZE:
                    break

            return results if results else (self.MOCK_MARKETS if not query else [])

        except Exception as e:
            print(f"⚠️  Kalshi API error: {e}")
            return self.MOCK_MARKETS if not query else []

    # ── Optional: category/tag helpers ──────────────────────────────
    def get_categories(self) -> List[str]:
        """Fetch unique categories from Kalshi series (optional)."""
        try:
            resp = httpx.get(f"{KALSHI_BASE}/series", timeout=10)
            resp.raise_for_status()
            series_list = resp.json().get("series", [])
            cats = sorted({s.get("category", "") for s in series_list if s.get("category")})
            return cats
        except Exception as e:
            print(f"⚠️  Kalshi categories error: {e}")
            return []

    def search_by_series(self, series_ticker: str) -> List[Dict[str, Any]]:
        """Fetch markets for a specific series ticker (optional filter)."""
        try:
            params = {
                "status": "open",
                "limit": PAGE_SIZE,
                "series_ticker": series_ticker,
                "mve_filter": "exclude",
            }
            resp = httpx.get(
                f"{KALSHI_BASE}/markets",
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            raw_markets = resp.json().get("markets", [])
            results = []
            for m in raw_markets:
                if not self._is_valid_market(m):
                    continue
                results.append(self._transform(m))
                if len(results) >= TARGET_RESULTS:
                    break
            return results
        except Exception as e:
            print(f"⚠️  Kalshi series search error: {e}")
            return []

    def get_market_details(self, market_id: str) -> Dict[str, Any]:
        try:
            resp = httpx.get(
                f"{KALSHI_BASE}/markets/{market_id}",
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json().get("market", {})
        except Exception as e:
            print(f"⚠️  Kalshi detail error: {e}")
            return {"id": market_id, "provider": "kalshi"}
