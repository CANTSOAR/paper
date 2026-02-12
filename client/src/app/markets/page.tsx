"use client";

import { useEffect, useState } from "react";

export default function MarketsPage() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log("MOCK DATA: Markets page loaded with fake contracts.");
        setTimeout(() => setIsLoading(false), 800);
    }, []);

    const markets = [
        {
            id: "kalshi-1",
            provider: "Kalshi",
            title: "Will Coffee (KC) close above $2.50 in Dec?",
            volume: "$142K",
            yesPrice: "42¢",
            noPrice: "58¢",
            expiry: "Dec 12, 2026"
        },
        {
            id: "poly-1",
            provider: "PolyMarket",
            title: "US Recession in 2026?",
            volume: "$2.1M",
            yesPrice: "18¢",
            noPrice: "82¢",
            expiry: "Dec 31, 2026"
        },
        {
            id: "kalshi-2",
            provider: "Kalshi",
            title: "Fed Interest Rate Cut in March",
            volume: "$890K",
            yesPrice: "65¢",
            noPrice: "35¢",
            expiry: "Mar 18, 2026"
        },
        {
            id: "poly-2",
            provider: "PolyMarket",
            title: "Bitcoin > $150k by Q3",
            volume: "$5.4M",
            yesPrice: "31¢",
            noPrice: "69¢",
            expiry: "Sep 30, 2026"
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-coffee animate-pulse">
                <div className="text-2xl font-serif">Loading Market Data...</div>
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
