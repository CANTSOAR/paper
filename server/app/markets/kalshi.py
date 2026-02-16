import httpx
from typing import List, Dict, Any
from .adapter import MarketAdapter

KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2"


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
        """Convert Kalshi cent value (0-100) to display string like '42¢'."""
        if cents <= 0:
            return "—"
        return f"{cents}¢"

    @staticmethod
    def _fmt_volume(vol: int) -> str:
        """Convert raw volume integer to human-readable string."""
        if vol >= 1_000_000:
            return f"${vol / 1_000_000:.1f}M"
        if vol >= 1_000:
            return f"${vol / 1_000:.0f}K"
        return f"${vol}"

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
                f"{KALSHI_BASE}/markets",
                params={"status": "open", "limit": 100},
                timeout=10,
            )
            resp.raise_for_status()
            raw_markets = resp.json().get("markets", [])

            results = []
            for m in raw_markets:
                title = m.get("title", "")
                # Skip combo/multi-leg/MVE markets
                if m.get("mve_collection_ticker"):
                    continue
                if title.lower().startswith("yes "):
                    continue
                if len(title) > 100:
                    continue
                if not title:
                    continue

                results.append({
                    "id": m.get("ticker", ""),
                    "provider": "Kalshi",
                    "title": title,
                    "volume": self._fmt_volume(m.get("volume", 0)),
                    "yesPrice": self._fmt_cents(m.get("yes_bid", 0)),
                    "noPrice": self._fmt_cents(m.get("no_bid", 0)),
                    "expiry": self._fmt_expiry(m.get("expiration_time", "")),
                })

                if len(results) >= 10:
                    break

            return results if results else self.MOCK_MARKETS

        except Exception as e:
            print(f"⚠️  Kalshi API error: {e}")
            return self.MOCK_MARKETS

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
