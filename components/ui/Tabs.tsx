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
            <div className="flex gap-2 mb-6 border-b border-pink-200/60 relative">
                <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-pink-300/40 to-transparent" />
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-5 py-3 font-bold text-sm sm:text-base rounded-t-xl transition-all duration-300 relative overflow-hidden group
                            ${
                                activeTab === tab.id
                                    ? "text-white shadow-xl shadow-pink-300/50 -translate-y-0.5 border-2 border-pink-400 border-b-0"
                                    : "text-gray-500 hover:text-pink-600 hover:bg-white/60 border-2 border-transparent border-b-0 hover:border-pink-200/60 hover:shadow-md"
                            }
                        `}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute inset-0 bg-linear-to-r from-rose-400 via-pink-500 to-rose-400" />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                        {/* Active shimmer */}
                        {activeTab === tab.id && (
                            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{activeTabContent}</div>
        </div>
    );
}
