"use client";

import { useState, type ReactNode } from "react";

export interface Tab {
    id: string;
    label: ReactNode;
    content: ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

    return (
        <div className="w-full">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b border-emerald-200/60 relative">
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-linear-to-r from-transparent via-emerald-400/50 to-transparent" />
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-5 py-3 font-bold text-sm sm:text-base rounded-t-2xl transition-all duration-300 relative overflow-hidden group
                            ${
                                activeTab === tab.id
                                    ? "text-white shadow-[0_-4px_12px_rgba(16,185,129,0.25)] -translate-y-0.5 border-t-2 border-l-2 border-r-2 border-emerald-300/50"
                                    : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/50 border-t-2 border-l-2 border-r-2 border-transparent hover:border-emerald-200/60 hover:shadow-sm"
                            }
                        `}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute inset-0 bg-linear-to-r from-emerald-500 via-green-400 to-teal-500" />
                        )}
                        <span className="relative z-10 drop-shadow-sm">
                            {tab.label}
                        </span>
                        {/* Active shimmer and inner glow */}
                        {activeTab === tab.id && (
                            <>
                                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent" />
                                <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent opacity-50" />
                            </>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{activeTabContent}</div>
        </div>
    );
}
