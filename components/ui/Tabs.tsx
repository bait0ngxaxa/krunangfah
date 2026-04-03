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
            {/* Tab Navigation — ซ่อนเมื่อมีแท็บเดียว */}
            {tabs.length > 1 && (
                <div className="flex gap-2 mb-6 p-1.5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                            flex-1 px-3 sm:px-5 py-3 font-bold text-sm sm:text-base rounded-xl transition-all duration-300 cursor-pointer border whitespace-nowrap min-w-fit relative
                            ${
                                activeTab === tab.id
                                    ? "text-emerald-700 bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-100"
                                    : "text-gray-600 bg-linear-to-b from-white to-gray-50 border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:bg-white hover:text-emerald-700 hover:border-emerald-200 hover:shadow-[0_6px_14px_-8px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.99]"
                            }
                        `}
                        >
                            {activeTab === tab.id && (
                                <span className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-linear-to-r from-emerald-400 to-teal-400" />
                            )}
                            <span className="relative z-10 drop-shadow-sm">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Tab Content */}
            <div className="animate-fadeIn">{activeTabContent}</div>
        </div>
    );
}
