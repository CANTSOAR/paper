import json
import httpx
from typing import List, Dict, Any
from .adapter import MarketAdapter

GAMMA_BASE = "https://gamma-api.polymarket.com"


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
        """Convert '0.42' decimal string to '42¢'."""
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
        """Convert raw volume float to human-readable string."""
        if vol >= 1_000_000:
            return f"${vol / 1_000_000:.1f}M"
        if vol >= 1_000:
            return f"${vol / 1_000:.0f}K"
        return f"${vol:.0f}"

    @staticmethod
    def _fmt_expiry(iso: str) -> str:
        """Convert ISO-8601 timestamp to 'Mar 18, 2026' format."""
        from datetime import datetime
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            return dt.strftime("%b %d, %Y")
        except Exception:
            return iso

    # ── Public API ────────────────────────────────────────────────────
    def search_markets(self, query: str) -> List[Dict[str, Any]]:
        try:
            resp = httpx.get(
                f"{GAMMA_BASE}/markets",
                params={"closed": "false", "limit": 10, "active": "true"},
                timeout=10,
            )
            resp.raise_for_status()
            raw_markets = resp.json()

            results = []
            for m in raw_markets:
                question = m.get("question", "")
                if not question:
                    continue

                # Parse outcome prices (JSON-encoded list: '["0.42", "0.58"]')
                prices_raw = m.get("outcomePrices", "[]")
                try:
                    prices = json.loads(prices_raw) if isinstance(prices_raw, str) else prices_raw
                except json.JSONDecodeError:
                    prices = []

                yes_price = prices[0] if len(prices) > 0 else "0"
                no_price = prices[1] if len(prices) > 1 else "0"

                results.append({
                    "id": m.get("id", ""),
                    "provider": "PolyMarket",
                    "title": question,
                    "volume": self._fmt_volume(m.get("volumeNum", 0) or 0),
                    "yesPrice": self._fmt_price(yes_price),
                    "noPrice": self._fmt_price(no_price),
                    "expiry": self._fmt_expiry(m.get("endDate", "")),
                })

            return results if results else self.MOCK_MARKETS

        except Exception as e:
            print(f"⚠️  PolyMarket API error: {e}")
            return self.MOCK_MARKETS

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
