"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchMarkets, type MarketContract } from "@/lib/api";

type Provider = "all" | "kalshi" | "polymarket";

export default function MarketsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [markets, setMarkets] = useState<MarketContract[]>([]);
    const [showKalshi, setShowKalshi] = useState(true);
    const [showPolymarket, setShowPolymarket] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const reqId = useRef(0); // prevent stale responses

    // Derive the provider value from the two independent toggles
    const provider: Provider =
        showKalshi && showPolymarket ? "all" :
            showKalshi ? "kalshi" :
                showPolymarket ? "polymarket" :
                    "all";

    // Debounce the search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchInput), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Fetch when debounced query or provider changes
    useEffect(() => {
        const id = ++reqId.current;
        setIsLoading(true);
        setError(null);
        fetchMarkets(debouncedQuery, provider)
            .then((data) => {
                if (id === reqId.current) setMarkets(data.markets);
            })
            .catch(() => {
                if (id === reqId.current) setError("Could not connect to the market engine.");
            })
            .finally(() => {
                if (id === reqId.current) setIsLoading(false);
            });
    }, [debouncedQuery, provider]);

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            {/* ── Header ─────────────────────────────────────────── */}
            <header className="mb-8 border-b-3 border-coffee/10 pb-6">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-5xl font-serif text-coffee mb-2">Market Browser</h1>
                        <p className="text-coffee-light font-medium text-lg">
                            Hedge your risks on top prediction markets.
                        </p>
                    </div>
                    {/* Provider toggles */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-coffee-light/60 select-none">
                            Filter:
                        </span>
                        <button
                            onClick={() => setShowKalshi(prev => !prev)}
                            className={`cursor-pointer px-4 py-2 font-bold text-sm tracking-wide border-2 transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 ${showKalshi
                                ? "bg-green-100 text-green-800 border-green-300"
                                : "bg-white text-coffee-light border-coffee/20 opacity-50 hover:opacity-75"
                                }`}
                        >
                            Kalshi
                        </button>
                        <button
                            onClick={() => setShowPolymarket(prev => !prev)}
                            className={`cursor-pointer px-4 py-2 font-bold text-sm tracking-wide border-2 transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 ${showPolymarket
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : "bg-white text-coffee-light border-coffee/20 opacity-50 hover:opacity-75"
                                }`}
                        >
                            PolyMarket
                        </button>
                    </div>
                </div>

                {/* Search bar — live debounced */}
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search markets... (e.g. Bitcoin, inflation, recession)"
                        className="flex-1 px-4 py-3 border-2 border-coffee/20 bg-white text-coffee font-medium placeholder:text-coffee-light/50 focus:outline-none focus:border-coffee transition-colors"
                    />
                    {searchInput && (
                        <button
                            type="button"
                            onClick={() => setSearchInput("")}
                            className="px-4 py-3 bg-white text-coffee-light font-bold border-2 border-coffee/20 hover:border-coffee/40 transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* ── Status indicators ──────────────────────────────── */}
            {debouncedQuery && (
                <div className="mb-6 text-coffee-light font-medium">
                    Showing results for <span className="text-coffee font-bold">&ldquo;{debouncedQuery}&rdquo;</span>
                    {provider !== "all" && (
                        <span> on <span className="font-bold capitalize">{provider}</span></span>
                    )}
                </div>
            )}

            {/* ── Loading ────────────────────────────────────────── */}
            {isLoading && (
                <div className="flex items-center justify-center min-h-[40vh] text-coffee animate-pulse">
                    <div className="text-2xl font-serif">Loading Market Data...</div>
                </div>
            )}

            {/* ── Error ──────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="p-6 bg-red-50 text-red-800 border-3 border-red-200 font-bold text-lg">
                        {error}
                    </div>
                </div>
            )}

            {/* ── No results ─────────────────────────────────────── */}
            {!isLoading && !error && markets.length === 0 && (
                <div className="flex items-center justify-center min-h-[40vh] text-coffee-light">
                    <div className="text-center">
                        <div className="text-2xl font-serif mb-2">No markets found</div>
                        <p className="font-medium">Try a different search term or toggle another provider.</p>
                    </div>
                </div>
            )}

            {/* ── Market grid ────────────────────────────────────── */}
            {!isLoading && !error && markets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {markets.map((market) => (
                        <div
                            key={market.id}
                            className="bg-white border-3 border-coffee shadow-[6px_6px_0px_0px_var(--color-coffee)] p-8 hover:shadow-[2px_2px_0px_0px_var(--color-coffee)] hover:translate-x-[2px] hover:translate-y-[4px] transition-all duration-200"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span
                                    className={`text-xs font-black uppercase tracking-widest px-2 py-1 ${market.provider === "Kalshi"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-blue-100 text-blue-800"
                                        }`}
                                >
                                    {market.provider}
                                </span>
                                <span className="text-coffee-light text-sm font-bold">
                                    {market.volume} Vol
                                </span>
                            </div>

                            <h3 className="text-2xl font-serif font-bold text-coffee mb-6 leading-tight min-h-[64px]">
                                {market.title}
                            </h3>

                            <div className="flex gap-4 mb-6">
                                <button className="flex-1 flex justify-between items-center px-4 py-3 bg-pistachio/10 border-2 border-pistachio-dark/30 text-pistachio-dark font-bold hover:bg-pistachio hover:text-white hover:border-pistachio transition-colors group">
                                    <span>YES</span>
                                    <span className="text-xl group-hover:text-white">
                                        {market.yesPrice}
                                    </span>
                                </button>
                                <button className="flex-1 flex justify-between items-center px-4 py-3 bg-red-50 border-2 border-red-200 text-red-800 font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors group">
                                    <span>NO</span>
                                    <span className="text-xl group-hover:text-white">
                                        {market.noPrice}
                                    </span>
                                </button>
                            </div>

                            <div className="flex justify-between items-center text-sm font-medium text-coffee-light">
                                <span>Expires: {market.expiry}</span>
                                <span className="text-coffee cursor-pointer hover:underline">
                                    Market Detail →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
