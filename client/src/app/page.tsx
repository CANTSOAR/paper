"use client";

import { useState, useRef, useEffect, useId } from "react";
import ReactMarkdown from "react-markdown";
import {
  sendChatMessage,
  dropChatSession,
  type ChatMessage,
  type MarketContract,
} from "@/lib/api";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [markets, setMarkets] = useState<MarketContract[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    // Optimistically add user message
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await sendChatMessage(messages, text, sessionId);
      setMessages(response.messages);
      if (response.markets.length > 0) {
        setMarkets(response.markets);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the risk engine. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleTool = (idx: number) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const resetChat = async () => {
    // Drop server-side cache
    try {
      await dropChatSession(sessionId);
    } catch {
      // best-effort
    }
    setMessages([]);
    setMarkets([]);
    setInput("");
    setExpandedTools(new Set());
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-130px)]">
      {/* Hero / empty state */}
      {!hasConversation && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-12 max-w-4xl">
            <h1 className="text-6xl sm:text-7xl font-serif font-black text-coffee mb-6 leading-tight">
              Hedge{" "}
              <span className="text-pistachio underline decoration-4 underline-offset-8 decoration-coffee">
                Everything
              </span>
              .
            </h1>
            <p className="text-xl sm:text-2xl text-coffee-light font-medium max-w-2xl mx-auto leading-relaxed">
              Tell me about your business and I&apos;ll find prediction markets to
              hedge your risks.
            </p>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-2xl">
            {[
              "I run a coffee shop in Seattle that imports beans from Brazil",
              "I'm a solar panel installer worried about tariff changes",
              "I manage a shipping company with routes through the Panama Canal",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                }}
                className="px-4 py-2 bg-white border-2 border-coffee/20 text-coffee-light text-sm font-medium hover:border-coffee hover:text-coffee transition-all cursor-pointer hover:shadow-md"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {hasConversation && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, idx) => {
              if (msg.role === "user") {
                return (
                  <div key={idx} className="flex justify-end">
                    <div className="max-w-[80%] px-5 py-3 bg-coffee text-cream font-medium rounded-none border-2 border-coffee shadow-[3px_3px_0px_0px_rgba(75,54,33,0.3)]">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.role === "tool") {
                const isExpanded = expandedTools.has(idx);
                return (
                  <div key={idx} className="flex justify-start">
                    <button
                      onClick={() => toggleTool(idx)}
                      className="px-4 py-2 bg-amber-50 border-2 border-amber-200 text-amber-800 text-sm font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <span>🔍</span>
                      <span>
                        Searched {msg.args?.provider || "all"} for &ldquo;
                        {msg.args?.query}&rdquo;
                      </span>
                      <span className="ml-1 px-2 py-0.5 bg-amber-200 text-amber-900 text-xs font-black">
                        {msg.result_count ?? 0} results
                      </span>
                      <span className="text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </div>
                );
              }

              // Assistant message — render markdown
              return (
                <div key={idx} className="flex justify-start">
                  <div className="max-w-[85%] px-5 py-3 bg-white border-2 border-coffee/15 text-coffee font-medium shadow-[3px_3px_0px_0px_#E5E5E5]">
                    <div className="prose prose-sm max-w-none prose-headings:text-coffee prose-headings:font-serif prose-headings:font-bold prose-p:text-coffee prose-p:leading-relaxed prose-strong:text-coffee prose-li:text-coffee prose-a:text-pistachio-dark prose-a:underline prose-a:font-semibold hover:prose-a:text-pistachio prose-code:text-coffee prose-code:bg-cream prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1 prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-table:text-sm prose-th:text-coffee prose-th:bg-cream prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5 prose-td:border-coffee/10">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="px-5 py-3 bg-white border-2 border-coffee/15 text-coffee-light font-medium shadow-[3px_3px_0px_0px_#E5E5E5]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-coffee/40 rounded-full animate-bounce [animation-delay:0ms]"></span>
                      <span className="w-2 h-2 bg-coffee/40 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-2 h-2 bg-coffee/40 rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </div>
                    <span className="text-sm">Thinking & searching markets...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Inline market recommendations */}
            {markets.length > 0 && !isLoading && (
              <div className="mt-6 pt-6 border-t-2 border-coffee/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-coffee-light/60">
                    Markets Found
                  </span>
                  <div className="h-px flex-grow bg-coffee/10"></div>
                  <span className="text-xs font-bold text-coffee-light/40">
                    {markets.length} results
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {markets.slice(0, 6).map((market) => (
                    <div
                      key={market.id}
                      className="bg-white border-2 border-coffee/20 p-4 hover:border-coffee/40 transition-colors shadow-[3px_3px_0px_0px_#E5E5E5]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 ${market.provider === "Kalshi"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                            }`}
                        >
                          {market.provider}
                        </span>
                        <span className="text-coffee-light text-xs font-bold">
                          {market.volume}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-coffee text-sm mb-3 leading-snug min-h-[40px]">
                        {market.title}
                      </h4>
                      <div className="flex gap-2">
                        <div className="flex-1 flex justify-between items-center px-2 py-1.5 bg-pistachio/10 border border-pistachio-dark/20 text-pistachio-dark text-xs font-bold">
                          <span>YES</span>
                          <span>{market.yesPrice}</span>
                        </div>
                        <div className="flex-1 flex justify-between items-center px-2 py-1.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
                          <span>NO</span>
                          <span>{market.noPrice}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t-2 border-coffee/10 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          {hasConversation && (
            <button
              onClick={resetChat}
              className="px-3 py-3 border-2 border-coffee/20 text-coffee-light font-bold text-sm hover:border-coffee/40 transition-colors cursor-pointer shrink-0"
              title="New Conversation"
            >
              ✕
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasConversation
                ? "Type a message..."
                : "Describe your business and I'll find markets to hedge your risks..."
            }
            rows={1}
            className="flex-1 px-4 py-3 border-2 border-coffee/20 bg-white text-coffee font-medium placeholder:text-coffee-light/50 focus:outline-none focus:border-coffee transition-colors resize-none min-h-[48px] max-h-[120px]"
            style={{
              height: "auto",
              overflow: input.split("\n").length > 3 ? "auto" : "hidden",
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`px-6 py-3 font-bold text-sm uppercase tracking-wider border-2 transition-all shadow-[3px_3px_0px_0px_rgba(75,54,33,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(75,54,33,1)] cursor-pointer shrink-0 ${isLoading || !input.trim()
              ? "bg-coffee-light text-cream border-coffee-light opacity-60 cursor-not-allowed"
              : "bg-coffee text-cream border-coffee hover:bg-pistachio hover:text-coffee hover:border-coffee"
              }`}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
