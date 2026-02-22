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
            <div className="flex gap-2 mb-6 p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/80">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex-1 px-5 py-3 font-bold text-sm sm:text-base rounded-xl transition-all duration-300 cursor-pointer border
                            ${
                                activeTab === tab.id
                                    ? "text-white bg-[#0BD0D9] border-[#09B8C0] shadow-[0_2px_8px_rgba(11,208,217,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] scale-[1.02]"
                                    : "text-gray-500 bg-white border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:text-emerald-700 hover:border-emerald-200 hover:shadow-md active:scale-95 active:shadow-sm"
                            }
                        `}
                    >
                        <span className="relative z-10 drop-shadow-sm">
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{activeTabContent}</div>
        </div>
    );
}
