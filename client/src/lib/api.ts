const API_BASE = "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────

export interface KPI {
    label: string;
    value: string;
    change: string;
    safe: boolean;
}

export interface ActiveRisk {
    id: number;
    name: string;
    probability: string;
    impact: string;
    hedgeStatus: string;
}

export interface DashboardData {
    kpis: KPI[];
    activeRisks: ActiveRisk[];
}

export interface MarketContract {
    id: string;
    provider: string;
    title: string;
    volume: string;
    yesPrice: string;
    noPrice: string;
    expiry: string;
}

export interface MarketsData {
    markets: MarketContract[];
}

export interface Position {
    id: number;
    market: string;
    side: string;
    shares: number;
    avgPrice: string;
    currentPrice: string;
    pnl: string;
    pnlPercent: string;
    isPositive: boolean;
}

export interface PortfolioSummary {
    totalValue: string;
    allTimeReturn: string;
}

export interface PortfolioData {
    summary: PortfolioSummary;
    positions: Position[];
}

// ── Fetch Helpers ────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export const fetchDashboard = () => apiFetch<DashboardData>("/dashboard");
export const fetchMarkets = (query = "", provider = "all") => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (provider !== "all") params.set("provider", provider);
    const qs = params.toString();
    return apiFetch<MarketsData>(`/markets${qs ? `?${qs}` : ""}`);
};
export const fetchPortfolio = () => apiFetch<PortfolioData>("/portfolio");

// ── Chat (Agentic conversation) ──────────────────────────────────────

export interface ChatMessage {
    role: "user" | "assistant" | "tool";
    content: string;
    tool?: string;
    args?: Record<string, string>;
    result_count?: number;
}

export interface ChatResponse {
    messages: ChatMessage[];
    markets: MarketContract[];
    tool_calls: Array<{
        tool: string;
        args: Record<string, string>;
        result_count: number;
    }>;
}

export async function sendChatMessage(
    messages: ChatMessage[],
    message: string,
    sessionId: string = "default",
): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, message, session_id: sessionId }),
    });
    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

export async function dropChatSession(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/chat/${sessionId}`, { method: "DELETE" });
}
