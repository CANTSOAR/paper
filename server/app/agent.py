"""
Agentic conversation loop with Gemini function calling.

The agent:
1. Converses with the user to understand business risks
2. Calls search_markets() tool autonomously to find relevant prediction markets
3. Evaluates results — re-queries if they don't fit, or asks user for clarification
4. Presents market recommendations with reasoning
"""

import json
import os
from typing import List, Dict, Any

import google.genai as genai
from google.genai import types

from .markets.kalshi import KalshiAdapter
from .markets.polymarket import PolyMarketAdapter

# ── Config ────────────────────────────────────────────────────────────

MAX_TOOL_CALLS = 5  # prevent infinite loops

SYSTEM_PROMPT = """You are a risk-hedging advisor for a platform called Paper. Your job is to help business owners identify operational risks and find prediction markets (on Kalshi and Polymarket) that can hedge those risks.

## Your Conversation Flow

1. **Greet & Ask** — Start by asking the user about their business: what they do, where they operate, key supply chain dependencies, and revenue drivers. Be conversational and concise.

2. **Clarify** — Ask 1-2 focused follow-up questions to understand the specific risks. Don't ask too many questions — get enough to act.

3. **Search Markets** — When you have enough context, use the `search_markets` tool to query prediction markets. Think carefully about what search terms will find relevant markets:
   - Be specific: "coffee price", "inflation rate", "hurricane florida"
   - Try different angles: "fed interest rate", "recession 2026", "supply chain disruption"
   - You can search multiple times with different queries

4. **Evaluate Results** — Look at the markets returned. Ask yourself:
   - Do these markets actually hedge the user's risk?
   - Are the prices/volumes reasonable?
   - Are there better search terms I could try?
   If results are poor, search again with different terms. If you've tried 2-3 times and can't find good markets, tell the user honestly.

5. **Recommend** — Present your top 3-5 market recommendations. For each, explain:
   - What risk it hedges
   - How the user should position (YES or NO)
   - Why this is a good hedge

## Important Rules

- Be conversational, not robotic. You're a smart advisor, not a form.
- Don't dump all questions at once — have a natural back-and-forth.
- When you search, briefly tell the user what you're looking for: "Let me search for markets related to coffee commodity prices..."
- If a search returns irrelevant results, don't show them to the user. Instead, refine your query and try again.
- Format market recommendations clearly with the market title, provider, prices, and your reasoning.
- Use the `provider` parameter to narrow searches when appropriate (e.g., use "kalshi" for financial/economic markets, "polymarket" for political/event markets).
- Keep responses concise. No walls of text.
"""

# ── Tool Definition ───────────────────────────────────────────────────

SEARCH_MARKETS_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_markets",
            description=(
                "Search prediction markets on Kalshi and/or Polymarket. "
                "Use this to find markets that could hedge a user's business risk. "
                "Returns a list of market contracts with titles, prices, and volumes."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "query": types.Schema(
                        type="STRING",
                        description=(
                            "Search query for markets. Be specific and risk-focused. "
                            "Examples: 'bitcoin price', 'fed interest rate', 'hurricane florida', "
                            "'oil price', 'recession', 'inflation'"
                        ),
                    ),
                    "provider": types.Schema(
                        type="STRING",
                        description=(
                            "Which market provider to search. Options: 'all', 'kalshi', 'polymarket'. "
                            "Use 'kalshi' for financial/commodity markets, 'polymarket' for political/event markets. "
                            "Default: 'all'"
                        ),
                    ),
                },
                required=["query"],
            ),
        )
    ]
)


# ── Session Market Cache ──────────────────────────────────────────────

class MarketCache:
    """In-memory cache of all markets for a conversation session.
    
    First search does an exhaustive fetch (no query) from both providers.
    Subsequent searches filter the cached results instantly.
    """

    def __init__(self, kalshi: "KalshiAdapter", polymarket: "PolyMarketAdapter"):
        self.kalshi = kalshi
        self.polymarket = polymarket
        self._kalshi_markets: list | None = None
        self._poly_markets: list | None = None

    def _ensure_loaded(self, provider: str) -> None:
        """Load all markets from a provider if not already cached."""
        p = provider.lower()
        if p in ("all", "kalshi") and self._kalshi_markets is None:
            print("📦 Cache: exhaustive fetch from Kalshi...")
            self._kalshi_markets = self.kalshi.search_markets("")
            print(f"📦 Cache: loaded {len(self._kalshi_markets)} Kalshi markets")
        if p in ("all", "polymarket") and self._poly_markets is None:
            print("📦 Cache: exhaustive fetch from Polymarket...")
            self._poly_markets = self.polymarket.search_markets("")
            print(f"📦 Cache: loaded {len(self._poly_markets)} Polymarket markets")

    def search(self, query: str, provider: str = "all") -> list:
        """Search cached markets. Loads cache on first call."""
        self._ensure_loaded(provider)

        p = provider.lower()
        pool: list = []
        if p in ("all", "kalshi") and self._kalshi_markets:
            pool.extend(self._kalshi_markets)
        if p in ("all", "polymarket") and self._poly_markets:
            pool.extend(self._poly_markets)

        if not query:
            return pool

        q_lower = query.lower()
        terms = q_lower.split()
        return [
            m for m in pool
            if any(t in m.get("title", "").lower() for t in terms)
        ]


# ── Agent ─────────────────────────────────────────────────────────────

class RiskAgent:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.kalshi = KalshiAdapter()
        self.polymarket = PolyMarketAdapter()
        # Session caches: session_id -> MarketCache
        self._caches: Dict[str, MarketCache] = {}

    def _get_cache(self, session_id: str) -> MarketCache:
        """Get or create a cache for this session."""
        if session_id not in self._caches:
            self._caches[session_id] = MarketCache(self.kalshi, self.polymarket)
        return self._caches[session_id]

    def drop_session(self, session_id: str) -> None:
        """Drop a session's cached markets."""
        self._caches.pop(session_id, None)

    def _execute_tool(self, fn_name: str, fn_args: dict, cache: MarketCache) -> dict:
        """Execute a tool call and return the result."""
        if fn_name == "search_markets":
            query = fn_args.get("query", "")
            provider = fn_args.get("provider", "all")

            all_results = cache.search(query, provider)

            return {
                "query": query,
                "provider": provider,
                "count": len(all_results),
                "markets": all_results,
            }
        return {"error": f"Unknown tool: {fn_name}"}


    def chat(
        self,
        history: List[Dict[str, Any]],
        user_message: str,
        session_id: str = "default",
    ) -> Dict[str, Any]:
        """
        Run one turn of the agent conversation.

        Args:
            history: Previous conversation messages
            user_message: The new user message

        Returns:
            {
                "messages": [...],     # full updated history including new messages
                "markets": [...],      # any markets found during this turn
                "tool_calls": [...]    # details of any tool calls made
            }
        """
        # Build Gemini content history from our message format
        gemini_contents = []
        for msg in history:
            role = msg["role"]
            if role == "user":
                gemini_contents.append(
                    types.Content(role="user", parts=[types.Part.from_text(text=msg["content"])])
                )
            elif role == "assistant":
                gemini_contents.append(
                    types.Content(role="model", parts=[types.Part.from_text(text=msg["content"])])
                )
            # Skip tool messages — they're embedded in the model turns

        # Add the new user message
        gemini_contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=user_message)])
        )

        # Track new messages and tool calls for this turn
        new_messages: list = [{"role": "user", "content": user_message}]
        all_markets: list = []
        tool_calls: list = []
        cache = self._get_cache(session_id)

        # Agent loop — LLM may call tools multiple times
        for _ in range(MAX_TOOL_CALLS):
            response = self.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=gemini_contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.7,
                    tools=[SEARCH_MARKETS_TOOL],
                ),
            )

            candidate = response.candidates[0]
            parts = candidate.content.parts

            # Check if there are function calls
            fn_call_parts = [p for p in parts if p.function_call]

            if not fn_call_parts:
                # No tool calls — we have a text response, we're done
                text = "".join(p.text for p in parts if p.text)
                new_messages.append({"role": "assistant", "content": text})
                break

            # Process each function call
            tool_response_parts = []
            for part in fn_call_parts:
                fc = part.function_call
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}

                # Execute the tool
                result = self._execute_tool(fn_name, fn_args, cache)

                # Track markets
                if "markets" in result:
                    all_markets.extend(result["markets"])

                # Track tool call for frontend display
                tool_calls.append({
                    "tool": fn_name,
                    "args": fn_args,
                    "result_count": result.get("count", 0),
                })

                # Build the function response
                tool_response_parts.append(
                    types.Part.from_function_response(
                        name=fn_name,
                        response=result,
                    )
                )

            # Add the model's function call + our response to the conversation
            gemini_contents.append(candidate.content)
            gemini_contents.append(
                types.Content(role="user", parts=tool_response_parts)
            )

            # Record tool calls in our message history
            for tc in tool_calls[-len(fn_call_parts):]:
                new_messages.append({
                    "role": "tool",
                    "content": json.dumps(tc),
                    "tool": tc["tool"],
                    "args": tc["args"],
                    "result_count": tc["result_count"],
                })

        else:
            # Exhausted tool call limit — append whatever text we have
            text_parts = [p.text for p in parts if p.text]
            if text_parts:
                new_messages.append({"role": "assistant", "content": "".join(text_parts)})
            else:
                new_messages.append({
                    "role": "assistant",
                    "content": "I've searched multiple times but couldn't find markets that perfectly fit. Let me know if you'd like me to try different search terms or if you can provide more details about your specific risks.",
                })

        return {
            "messages": history + new_messages,
            "markets": all_markets,
            "tool_calls": tool_calls,
        }
