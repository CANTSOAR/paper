"use client";

import { useState } from "react";
import RiskInput from "@/components/RiskInput";

interface Risk {
  id: string;
  name: string;
  likelihood: string;
  impact: string;
  description: string;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [risks, setRisks] = useState<null | Risk[]>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (description: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze risks");
      }

      const data = await response.json();
      setRisks(data.risks);
    } catch (err) {
      setError("Failed to connect to the risk engine. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-full py-16 px-4 sm:px-20">
      <div className="text-center mb-16 max-w-4xl">
        <h1 className="text-6xl sm:text-7xl font-serif font-black text-coffee mb-6 leading-tight">
          Hedge <span className="text-pistachio underline decoration-4 underline-offset-8 decoration-coffee">Everything</span>.
        </h1>
        <p className="text-xl sm:text-2xl text-coffee-light font-medium max-w-2xl mx-auto leading-relaxed">
          Turn your business operations into a hedged portfolio using real-world prediction markets.
        </p>
      </div>

      <RiskInput onSubmit={handleAnalyze} isLoading={isLoading} />

      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-800 border-3 border-red-200 font-bold">
          {error}
        </div>
      )}

      {risks && (
        <div className="w-full max-w-3xl mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-coffee flex-grow opacity-30"></div>
            <h3 className="text-2xl font-serif font-bold text-coffee">Identified Risks</h3>
            <div className="h-px bg-coffee flex-grow opacity-30"></div>
          </div>

          <div className="grid gap-6">
            {risks.map((risk) => (
              <div key={risk.id} className="group p-6 bg-white border-3 border-coffee hover:border-pistachio transition-colors shadow-[4px_4px_0px_0px_#E5E5E5] hover:shadow-[4px_4px_0px_0px_#93C572]">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-serif font-bold text-xl text-coffee group-hover:text-pistachio-dark transition-colors">{risk.name}</h4>
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border-2 ${risk.likelihood === 'High'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    }`}>
                    {risk.likelihood} Likelihood
                  </span>
                </div>
                <p className="text-coffee-light text-lg mb-3">{risk.description}</p>
                <div className="flex items-center gap-2 text-sm font-bold text-coffee/60">
                  <span className="uppercase tracking-widest text-xs">Impact</span>
                  <span className="h-px w-8 bg-coffee/30"></span>
                  <span>{risk.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
