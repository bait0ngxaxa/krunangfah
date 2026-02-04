"use client";

import { useState, type ReactNode } from "react";

export interface Tab {
    id: string;
    label: string;
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
                <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-pink-200 to-transparent" />
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 font-bold text-base rounded-t-xl transition-all duration-300 relative overflow-hidden group
                            ${
                                activeTab === tab.id
                                    ? "text-white shadow-lg shadow-pink-200/50 -translate-y-1"
                                    : "text-gray-500 hover:text-pink-600 hover:bg-white/60"
                            }
                        `}
                    >
                        {activeTab === tab.id && (
                            <div className="absolute inset-0 bg-linear-to-r from-rose-400 to-pink-500" />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                        {/* Active Indicator Line for clean look */}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-pink-600/20" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{activeTabContent}</div>
        </div>
    );
}
