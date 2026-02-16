"use client";

import { useEffect, useState } from "react";
import { fetchDashboard, type KPI, type ActiveRisk } from "@/lib/api";

export default function DashboardPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [activeRisks, setActiveRisks] = useState<ActiveRisk[]>([]);

    useEffect(() => {
        fetchDashboard()
            .then((data) => {
                setKpis(data.kpis);
                setActiveRisks(data.activeRisks);
            })
            .catch((err) => {
                console.error("Failed to load dashboard:", err);
                setError("Could not connect to the risk engine.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-coffee animate-pulse">
                <div className="text-2xl font-serif">Loading Risk Profile...</div>
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
                    <h1 className="text-5xl font-serif text-coffee mb-2">Risk Dashboard</h1>
                    <p className="text-coffee-light font-medium text-lg">Overview of your operational exposure.</p>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="card group hover:-translate-y-1 transition-transform duration-300">
                        <h3 className="text-coffee-light font-bold uppercase tracking-widest text-sm mb-2">{kpi.label}</h3>
                        <div className="text-5xl font-serif text-coffee mb-2">{kpi.value}</div>
                        <div className={`font-bold text-sm ${kpi.safe ? 'text-pistachio-dark' : 'text-orange-700'}`}>
                            {kpi.change}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Risks Table */}
            <div className="bg-white border-3 border-coffee shadow-[8px_8px_0px_0px_var(--color-coffee)] p-8">
                <h2 className="text-3xl font-serif text-coffee mb-8">Active Risk Monitor</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-3 border-coffee text-coffee-light uppercase tracking-widest text-sm">
                                <th className="pb-4 pl-2">Risk Factor</th>
                                <th className="pb-4">Probability</th>
                                <th className="pb-4">Impact</th>
                                <th className="pb-4">Status</th>
                                <th className="pb-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-coffee/10 font-medium text-coffee">
                            {activeRisks.map((risk) => (
                                <tr key={risk.id} className="hover:bg-pistachio/5 transition-colors">
                                    <td className="py-6 pl-2 text-lg">{risk.name}</td>
                                    <td className="py-6">
                                        <span className="font-bold">{risk.probability}</span>
                                    </td>
                                    <td className="py-6">
                                        <span className={`px-3 py-1 text-xs border-2 font-bold uppercase ${risk.impact === 'Severe' ? 'bg-red-50 text-red-800 border-red-200' :
                                            risk.impact === 'High' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                                'bg-blue-50 text-blue-800 border-blue-200'
                                            }`}>
                                            {risk.impact}
                                        </span>
                                    </td>
                                    <td className="py-6">
                                        <span className={`flex items-center gap-2 ${risk.hedgeStatus === 'Unhedged' ? 'text-red-700' : 'text-pistachio-dark'
                                            }`}>
                                            <span className={`h-2 w-2 rounded-full ${risk.hedgeStatus === 'Unhedged' ? 'bg-red-700' : 'bg-pistachio-dark'
                                                }`}></span>
                                            {risk.hedgeStatus}
                                        </span>
                                    </td>
                                    <td className="py-6 text-right">
                                        <button className="text-sm font-bold underline decoration-2 underline-offset-4 decoration-pistachio hover:text-pistachio-dark transition-colors">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
