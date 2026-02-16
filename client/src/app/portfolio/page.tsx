"use client";

import { useEffect, useState } from "react";
import { fetchPortfolio, type Position, type PortfolioSummary } from "@/lib/api";

export default function PortfolioPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<PortfolioSummary | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);

    useEffect(() => {
        fetchPortfolio()
            .then((data) => {
                setSummary(data.summary);
                setPositions(data.positions);
            })
            .catch((err) => {
                console.error("Failed to load portfolio:", err);
                setError("Could not connect to the portfolio engine.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-coffee animate-pulse">
                <div className="text-2xl font-serif">Loading Portfolio...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="p-6 bg-red-50 text-red-800 border-3 border-red-200 font-bold text-lg">{error}</div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <header className="mb-12 flex justify-between items-end border-b-3 border-coffee/10 pb-6">
                <div>
                    <h1 className="text-5xl font-serif text-coffee mb-2">My Portfolio</h1>
                    <p className="text-coffee-light font-medium text-lg">Active hedges and performance tracking.</p>
                </div>
                {summary && (
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-coffee-light uppercase tracking-widest">Total Value</span>
                        <span className="text-4xl font-serif text-coffee font-bold">{summary.totalValue}</span>
                        <span className="text-pistachio-dark font-bold text-sm">{summary.allTimeReturn}</span>
                    </div>
                )}
            </header>

            <div className="flex gap-8 items-start">
                {/* Main Positions List */}
                <div className="flex-grow bg-white border-3 border-coffee shadow-[8px_8px_0px_0px_var(--color-coffee)] p-0">
                    <div className="p-6 border-b-3 border-coffee bg-cream/50">
                        <h3 className="text-xl font-serif font-bold text-coffee">Active Positions</h3>
                    </div>
                    <div className="divide-y-2 divide-coffee/10">
                        {positions.map((pos) => (
                            <div key={pos.id} className="p-6 hover:bg-pistachio/5 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className={`h-12 w-12 flex items-center justify-center font-black text-lg border-2 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${pos.side === 'YES' ? 'bg-pistachio text-white border-pistachio-dark' : 'bg-red-500 text-white border-red-700'
                                        }`}>
                                        {pos.side[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-coffee">{pos.market}</h4>
                                        <div className="text-sm text-coffee-light font-medium mt-1">
                                            {pos.shares} Shares • Avg: {pos.avgPrice}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-2xl font-serif text-coffee font-bold">{pos.currentPrice}</div>
                                    <div className={`text-sm font-bold ${pos.isPositive ? 'text-pistachio-dark' : 'text-red-600'}`}>
                                        {pos.pnl} ({pos.pnlPercent})
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-cream/50 border-t-3 border-coffee text-center">
                        <button className="font-bold text-coffee-light hover:text-coffee uppercase tracking-widest text-sm transition-colors">View Closed Positions</button>
                    </div>
                </div>

                {/* Sidebar / Actions */}
                <div className="w-80 flex-shrink-0 flex flex-col gap-6">
                    <div className="bg-coffee text-cream p-6 border-3 border-coffee shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                        <h3 className="text-xl font-serif font-bold mb-2">Rebalance Alert</h3>
                        <p className="text-coffee-latte text-sm mb-4 leading-relaxed">
                            Your &quot;Coffee Futures&quot; hedge is 15% underweight due to recent drift.
                        </p>
                        <button className="w-full bg-pistachio text-coffee font-bold py-3 uppercase tracking-widest hover:bg-white transition-colors">
                            Rebalance Now
                        </button>
                    </div>

                    <div className="bg-white p-6 border-3 border-coffee shadow-[4px_4px_0px_0px_var(--color-coffee)]">
                        <h3 className="text-lg font-bold text-coffee mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-coffee-light">Daily Theta</span>
                                <span className="font-bold text-coffee">-$14.20</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-coffee-light">Sharpe Ratio</span>
                                <span className="font-bold text-coffee">1.8</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
