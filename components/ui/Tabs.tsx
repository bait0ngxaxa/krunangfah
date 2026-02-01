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
            <div className="flex gap-2 mb-6 border-b-2 border-pink-100">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-6 py-3 font-bold text-base rounded-t-lg transition-all duration-300
                            ${
                                activeTab === tab.id
                                    ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-md transform -translate-y-0.5"
                                    : "bg-white/50 text-gray-600 hover:bg-white/80 hover:text-gray-800"
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">{activeTabContent}</div>
        </div>
    );
}
