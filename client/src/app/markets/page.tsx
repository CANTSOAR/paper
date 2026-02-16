"use client";

import { useEffect, useState } from "react";
import { fetchMarkets, type MarketContract } from "@/lib/api";

export default function MarketsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [markets, setMarkets] = useState<MarketContract[]>([]);

    useEffect(() => {
        fetchMarkets()
            .then((data) => {
                setMarkets(data.markets);
            })
            .catch((err) => {
                console.error("Failed to load markets:", err);
                setError("Could not connect to the market engine.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-coffee animate-pulse">
                <div className="text-2xl font-serif">Loading Market Data...</div>
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
                    <h1 className="text-5xl font-serif text-coffee mb-2">Market Browser</h1>
                    <p className="text-coffee-light font-medium text-lg">Hedge your risks on top prediction markets.</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-4 py-2 font-bold text-coffee border-2 border-coffee bg-white hover:bg-coffee hover:text-white transition-colors">Kalshi</button>
                    <button className="px-4 py-2 font-bold text-coffee-light border-2 border-transparent hover:text-coffee transition-colors">PolyMarket</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                {markets.map((market) => (
                    <div key={market.id} className="bg-white border-3 border-coffee shadow-[6px_6px_0px_0px_var(--color-coffee)] p-8 hover:shadow-[2px_2px_0px_0px_var(--color-coffee)] hover:translate-x-[2px] hover:translate-y-[4px] transition-all duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 ${market.provider === 'Kalshi' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                {market.provider}
                            </span>
                            <span className="text-coffee-light text-sm font-bold">{market.volume} Vol</span>
                        </div>

                        <h3 className="text-2xl font-serif font-bold text-coffee mb-6 leading-tight min-h-[64px]">
                            {market.title}
                        </h3>

                        <div className="flex gap-4 mb-6">
                            <button className="flex-1 flex justify-between items-center px-4 py-3 bg-pistachio/10 border-2 border-pistachio-dark/30 text-pistachio-dark font-bold hover:bg-pistachio hover:text-white hover:border-pistachio transition-colors group">
                                <span>YES</span>
                                <span className="text-xl group-hover:text-white">{market.yesPrice}</span>
                            </button>
                            <button className="flex-1 flex justify-between items-center px-4 py-3 bg-red-50 border-2 border-red-200 text-red-800 font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors group">
                                <span>NO</span>
                                <span className="text-xl group-hover:text-white">{market.noPrice}</span>
                            </button>
                        </div>

                        <div className="flex justify-between items-center text-sm font-medium text-coffee-light">
                            <span>Expires: {market.expiry}</span>
                            <span className="text-coffee cursor-pointer hover:underline">Market Detail →</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
