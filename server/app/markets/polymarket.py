import json
import httpx
from typing import List, Dict, Any
from .adapter import MarketAdapter

GAMMA_BASE = "https://gamma-api.polymarket.com"

TARGET_RESULTS = 20
PAGE_SIZE = 1000
MAX_PAGES = 10


class PolyMarketAdapter(MarketAdapter):

    # ── Mock fallback ─────────────────────────────────────────────────
    MOCK_MARKETS = [
        {
            "id": "poly-1",
            "provider": "PolyMarket",
            "title": "US Recession in 2026?",
            "volume": "$2.1M",
            "yesPrice": "18¢",
            "noPrice": "82¢",
            "expiry": "Dec 31, 2026",
        },
        {
            "id": "poly-2",
            "provider": "PolyMarket",
            "title": "Bitcoin > $150k by Q3",
            "volume": "$5.4M",
            "yesPrice": "31¢",
            "noPrice": "69¢",
            "expiry": "Sep 30, 2026",
        },
    ]

    # ── Helpers ───────────────────────────────────────────────────────
    @staticmethod
    def _fmt_price(decimal_str: str) -> str:
        try:
            val = float(decimal_str)
            cents = round(val * 100)
            if cents <= 0:
                return "—"
            return f"{cents}¢"
        except (ValueError, TypeError):
            return "—"

    @staticmethod
    def _fmt_volume(vol: float) -> str:
        if vol >= 1_000_000:
            return f"${vol / 1_000_000:.1f}M"
        if vol >= 1_000:
            return f"${vol / 1_000:.0f}K"
        return f"${vol:.0f}"

    @staticmethod
    def _fmt_expiry(iso: str) -> str:
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            return dt.strftime("%b %d, %Y")
        except Exception:
            return iso

    def _transform(self, m: dict) -> dict:
        prices_raw = m.get("outcomePrices", "[]")
        try:
            prices = json.loads(prices_raw) if isinstance(prices_raw, str) else prices_raw
        except json.JSONDecodeError:
            prices = []

        yes_price = prices[0] if len(prices) > 0 else "0"
        no_price = prices[1] if len(prices) > 1 else "0"

        return {
            "id": m.get("id", ""),
            "provider": "PolyMarket",
            "title": m.get("question", ""),
            "volume": self._fmt_volume(m.get("volumeNum", 0) or 0),
            "yesPrice": self._fmt_price(yes_price),
            "noPrice": self._fmt_price(no_price),
            "expiry": self._fmt_expiry(m.get("endDate", "")),
        }

    # ── Search via /public-search (fast, server-side full-text) ───────
    def _search_public(self, query: str) -> List[Dict[str, Any]]:
        """Use Polymarket's dedicated full-text search endpoint."""
        resp = httpx.get(
            f"{GAMMA_BASE}/public-search",
            params={"q": query},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        results: list = []
        for event in data.get("events", []):
            for m in event.get("markets", []):
                question = m.get("question", "")
                if not question:
                    continue
                # Skip closed markets
                if m.get("closed"):
                    continue
                results.append(self._transform(m))
                if len(results) >= TARGET_RESULTS:
                    return results

        return results

    # ── Browse via /markets (paginated, for default view) ─────────────
    def _browse_markets(self) -> List[Dict[str, Any]]:
        """Paginate through /markets for the default (no-query) view."""
        results: list = []
        offset = 0

        for _ in range(MAX_PAGES):
            params: dict = {
                "closed": "false",
                "active": "true",
                "limit": PAGE_SIZE,
                "offset": offset,
            }
            resp = httpx.get(
                f"{GAMMA_BASE}/markets",
                params=params,
                timeout=10,
            )
            resp.raise_for_status()
            raw_markets = resp.json()

            for m in raw_markets:
                question = m.get("question", "")
                if not question:
                    continue
                results.append(self._transform(m))
                if len(results) >= TARGET_RESULTS:
                    return results

            if len(raw_markets) < PAGE_SIZE:
                break
            offset += PAGE_SIZE

        return results

    # ── Public API ────────────────────────────────────────────────────
    def search_markets(self, query: str) -> List[Dict[str, Any]]:
        try:
            if query:
                results = self._search_public(query)
            else:
                results = self._browse_markets()

            return results if results else (self.MOCK_MARKETS if not query else [])

        except Exception as e:
            print(f"⚠️  PolyMarket API error: {e}")
            return self.MOCK_MARKETS if not query else []

    def get_market_details(self, market_id: str) -> Dict[str, Any]:
        try:
            resp = httpx.get(
                f"{GAMMA_BASE}/markets/{market_id}",
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"⚠️  PolyMarket detail error: {e}")
            return {"id": market_id, "provider": "polymarket"}
