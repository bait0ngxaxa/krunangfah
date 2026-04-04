"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface Tab {
    id: string;
    label: ReactNode;
    content: ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
    /** When true, syncs active tab with URL ?tab= parameter */
    syncWithUrl?: boolean;
}

export function Tabs({ tabs, defaultTab, syncWithUrl = false }: TabsProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const resolveUrlTab = useCallback((): string => {
        if (syncWithUrl) {
            const urlTab = searchParams.get("tab");
            if (urlTab && tabs.some((t) => t.id === urlTab)) {
                return urlTab;
            }
        }
        return defaultTab || tabs[0]?.id || "";
    }, [syncWithUrl, searchParams, tabs, defaultTab]);

    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

    const handleTabChange = useCallback(
        (tabId: string): void => {
            if (syncWithUrl) {
                const params = new URLSearchParams(searchParams.toString());
                params.set("tab", tabId);
                router.replace(`${pathname}?${params.toString()}`, {
                    scroll: false,
                });
                return;
            }
            setActiveTab(tabId);
        },
        [syncWithUrl, searchParams, router, pathname],
    );

    // In URL-sync mode, the query string is the source of truth (supports back/forward reliably).
    const resolvedActiveTab = syncWithUrl ? resolveUrlTab() : activeTab;
    const activeTabContent = tabs.find((tab) => tab.id === resolvedActiveTab)?.content;
    const activeTabButtonId = `tab-${resolvedActiveTab}`;
    const tabPanelId = "tabs-panel";

    return (
        <div className="w-full">
            {tabs.length > 1 && (
                <div
                    className="flex gap-2 mb-6 p-1.5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-x-auto scrollbar-hide"
                    role="tablist"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            role="tab"
                            aria-selected={resolvedActiveTab === tab.id}
                            aria-controls={tabPanelId}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                            flex-1 px-3 sm:px-5 py-3 font-bold text-sm sm:text-base rounded-xl transition-base duration-300 cursor-pointer border whitespace-nowrap min-w-fit relative
                            ${
                                resolvedActiveTab === tab.id
                                    ? "text-emerald-700 bg-white border-emerald-200 shadow-sm ring-1 ring-emerald-100"
                                    : "text-gray-600 bg-linear-to-b from-white to-gray-50 border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:-translate-y-0.5 hover:bg-white hover:text-emerald-700 hover:border-emerald-200 hover:shadow-[0_6px_14px_-8px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.99]"
                            }
                        `}
                        >
                            {resolvedActiveTab === tab.id && (
                                <span className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-linear-to-r from-emerald-400 to-teal-400" />
                            )}
                            <span className="relative z-10 drop-shadow-sm">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div
                id={tabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabButtonId}
                className="animate-fadeIn"
            >
                {activeTabContent}
            </div>
        </div>
    );
}
