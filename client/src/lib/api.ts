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
export const fetchMarkets = () => apiFetch<MarketsData>("/markets");
export const fetchPortfolio = () => apiFetch<PortfolioData>("/portfolio");
