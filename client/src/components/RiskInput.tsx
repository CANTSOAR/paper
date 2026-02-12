"use client";

import { useState } from "react";

interface RiskInputProps {
    onSubmit: (description: string) => void;
    isLoading: boolean;
}

export default function RiskInput({ onSubmit, isLoading }: RiskInputProps) {
    const [description, setDescription] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim()) {
            onSubmit(description);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-white border-3 border-coffee p-8 shadow-[8px_8px_0px_0px_rgba(75,54,33,1)]">
            <h2 className="text-3xl font-serif font-bold mb-4 text-coffee">Describe Your Operations</h2>
            <p className="text-coffee-light mb-6 font-medium">
                Tell us about your business model, supply chain dependencies, and key revenue drivers.
                <br />We'll identify your implicit market risks.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <textarea
                    className="w-full h-40 p-5 border-3 border-coffee-light/30 rounded-none focus:ring-0 focus:border-coffee transition-all text-lg placeholder:text-coffee-latte font-sans text-coffee"
                    placeholder="e.g., I run a specialty coffee shop in Seattle. We import beans heavily from Brazil and rely on local foot traffic..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !description.trim()}
                    className={`w-full py-4 px-8 text-cream font-bold text-lg uppercase tracking-widest border-3 border-coffee transition-all shadow-[4px_4px_0px_0px_rgba(75,54,33,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(75,54,33,1)] ${isLoading || !description.trim()
                            ? "bg-coffee-light cursor-not-allowed opacity-70"
                            : "bg-coffee hover:bg-pistachio hover:text-coffee hover:border-coffee"
                        }`}
                >
                    {isLoading ? "Analyzing Risks..." : "Identify Risks"}
                </button>
            </form>
        </div>
    );
}
