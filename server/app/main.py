from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
from typing import List, Optional
from dotenv import load_dotenv
import google.genai as genai

from .markets.kalshi import KalshiAdapter
from .markets.polymarket import PolyMarketAdapter
from .agent import RiskAgent

load_dotenv()

app = FastAPI(title="Prediction Market Hedging API")

# ── Gemini Setup ──────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY and GEMINI_API_KEY != "your-api-key-here":
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    risk_agent = RiskAgent(api_key=GEMINI_API_KEY)
else:
    gemini_client = None
    risk_agent = None
    print("⚠️  GEMINI_API_KEY not set — /analyze and /chat will return mock data.")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Adapters ──────────────────────────────────────────────────────────
kalshi = KalshiAdapter()
polymarket = PolyMarketAdapter()

# ── Pydantic Models ───────────────────────────────────────────────────

class BusinessDescription(BaseModel):
    description: str

class Risk(BaseModel):
    id: str
    name: str
    likelihood: str
    impact: str
    description: str

class AnalyzeResponse(BaseModel):
    risks: List[Risk]

class KPI(BaseModel):
    label: str
    value: str
    change: str
    safe: bool

class ActiveRisk(BaseModel):
    id: int
    name: str
    probability: str
    impact: str
    hedgeStatus: str

class DashboardResponse(BaseModel):
    kpis: List[KPI]
    activeRisks: List[ActiveRisk]

class MarketContract(BaseModel):
    id: str
    provider: str
    title: str
    volume: str
    yesPrice: str
    noPrice: str
    expiry: str

class MarketsResponse(BaseModel):
    markets: List[MarketContract]

class Position(BaseModel):
    id: int
    market: str
    side: str
    shares: int
    avgPrice: str
    currentPrice: str
    pnl: str
    pnlPercent: str
    isPositive: bool

class PortfolioSummary(BaseModel):
    totalValue: str
    allTimeReturn: str

class PortfolioResponse(BaseModel):
    summary: PortfolioSummary
    positions: List[Position]

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "tool"
    content: str
    tool: Optional[str] = None
    args: Optional[dict] = None
    result_count: Optional[int] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = []
    message: str
    session_id: str = "default"

class ChatResponse(BaseModel):
    messages: List[ChatMessage]
    markets: List[MarketContract] = []
    tool_calls: List[dict] = []

# ── Health ────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Risk Engine Online"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ── Chat (Agentic conversation) ──────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if risk_agent is None:
        return ChatResponse(
            messages=[
                ChatMessage(role="user", content=req.message),
                ChatMessage(
                    role="assistant",
                    content="I'm sorry, the AI engine isn't configured yet. Please set a GEMINI_API_KEY in the server .env file.",
                ),
            ],
            markets=[],
            tool_calls=[],
        )

    try:
        history = [msg.model_dump() for msg in req.messages]
        result = risk_agent.chat(history, req.message, session_id=req.session_id)

        # Convert dicts back to Pydantic models
        messages_out = [ChatMessage(**m) for m in result["messages"]]
        markets_out = [MarketContract(**m) for m in result.get("markets", [])]

        return ChatResponse(
            messages=messages_out,
            markets=markets_out,
            tool_calls=result.get("tool_calls", []),
        )
    except Exception as e:
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        history_msgs = [ChatMessage(**msg.model_dump()) for msg in req.messages]
        return ChatResponse(
            messages=history_msgs + [
                ChatMessage(role="user", content=req.message),
                ChatMessage(
                    role="assistant",
                    content=f"I encountered an error while processing your request. Please try again. ({type(e).__name__})",
                ),
            ],
            markets=[],
            tool_calls=[],
        )

@app.delete("/chat/{session_id}")
def drop_chat_session(session_id: str):
    if risk_agent:
        risk_agent.drop_session(session_id)
    return {"status": "ok"}

# ── Analyze (Gemini-powered) ─────────────────────────────────────────

RISK_ANALYSIS_PROMPT = """You are a risk analysis engine for a business hedging platform.

Given the following business description, identify 3-5 concrete, specific operational risks that could be hedged using prediction markets.

For each risk, provide:
- id: a unique identifier like "risk-1", "risk-2", etc.
- name: a short, specific name for the risk (e.g. "Arabica Futures Price Spike")
- likelihood: one of "High", "Medium", or "Low"
- impact: one of "Severe", "High", "Moderate", or "Low"
- description: a 1-2 sentence explanation of why this is a risk for this specific business

Respond ONLY with valid JSON in this exact format, no markdown or extra text:
{
  "risks": [
    {"id": "risk-1", "name": "...", "likelihood": "...", "impact": "...", "description": "..."}
  ]
}

Business description:
"""

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_risks(data: BusinessDescription):
    if gemini_client is None:
        # Fallback to mock data if no API key
        return AnalyzeResponse(risks=[
            Risk(id="risk-1", name="Coffee Bean Price Surge", likelihood="High", impact="Severe",
                 description="Exposure to Arabica futures volatility due to reliance on Brazilian imports."),
            Risk(id="risk-2", name="Supply Chain Disruption", likelihood="Medium", impact="High",
                 description="Potential shipping delays affecting inventory levels during peak season."),
            Risk(id="risk-3", name="Local Foot Traffic Decline", likelihood="Low", impact="Moderate",
                 description="Risk of reduced revenue due to local economic downturn or weather events."),
        ])

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=RISK_ANALYSIS_PROMPT + data.description,
            config=genai.types.GenerateContentConfig(
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )

        result = json.loads(response.text)
        risks = [Risk(**r) for r in result["risks"]]
        return AnalyzeResponse(risks=risks)

    except Exception as e:
        print(f"Gemini API error: {e}")
        # Graceful fallback to mock on failure
        return AnalyzeResponse(risks=[
            Risk(id="risk-1", name="Analysis Unavailable", likelihood="Medium", impact="Moderate",
                 description=f"The AI risk engine encountered an error. Please try again. ({type(e).__name__})"),
        ])

# ── Dashboard ─────────────────────────────────────────────────────────

@app.get("/dashboard", response_model=DashboardResponse)
def get_dashboard():
    kpis = [
        KPI(label="Active Risks", value="7", change="+2", safe=False),
        KPI(label="Hedged Value", value="$42,500", change="+12%", safe=True),
        KPI(label="Portfolio ROI", value="+8.4%", change="vs Last Month", safe=True),
    ]

    active_risks = [
        ActiveRisk(id=1, name="Coffee Futures (KC)", probability="78%", impact="High", hedgeStatus="Partially Hedged"),
        ActiveRisk(id=2, name="Port Strike (East Coast)", probability="45%", impact="Severe", hedgeStatus="Unhedged"),
        ActiveRisk(id=3, name="Inflation Rate > 3.5%", probability="30%", impact="Moderate", hedgeStatus="Fully Hedged"),
    ]

    return DashboardResponse(kpis=kpis, activeRisks=active_risks)

# ── Markets ───────────────────────────────────────────────────────────

@app.get("/markets", response_model=MarketsResponse)
def get_markets(query: str = "", provider: str = "all"):
    all_raw: list = []
    p = provider.lower()

    if p in ("all", "kalshi"):
        all_raw.extend(kalshi.search_markets(query))
    if p in ("all", "polymarket"):
        all_raw.extend(polymarket.search_markets(query))

    all_markets = [MarketContract(**m) for m in all_raw]
    return MarketsResponse(markets=all_markets)

@app.get("/kalshi/categories")
def get_kalshi_categories():
    return {"categories": kalshi.get_categories()}

# ── Portfolio ─────────────────────────────────────────────────────────

@app.get("/portfolio", response_model=PortfolioResponse)
def get_portfolio():
    summary = PortfolioSummary(totalValue="$42,500", allTimeReturn="+8.4% All Time")

    positions = [
        Position(id=1, market="Coffee Bean Shortage Q3", side="YES", shares=1500,
                 avgPrice="$0.42", currentPrice="$0.55", pnl="+$195.00", pnlPercent="+31%", isPositive=True),
        Position(id=2, market="US Inflation < 3.0%", side="NO", shares=500,
                 avgPrice="$0.30", currentPrice="$0.28", pnl="-$10.00", pnlPercent="-6.6%", isPositive=False),
        Position(id=3, market="Panama Canal Restrictions", side="YES", shares=2000,
                 avgPrice="$0.60", currentPrice="$0.65", pnl="+$100.00", pnlPercent="+8.3%", isPositive=True),
    ]

    return PortfolioResponse(summary=summary, positions=positions)
