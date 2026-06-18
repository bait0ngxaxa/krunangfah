"use client";

import {
    useId,
    useState,
    useCallback,
    type KeyboardEvent,
    type ReactNode,
} from "react";
import { useSearchParams, usePathname } from "next/navigation";

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
    const instanceId = useId();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const fallbackTabId = defaultTab || tabs[0]?.id || "";

    const resolveUrlTab = useCallback((): string => {
        if (syncWithUrl) {
            const urlTab = searchParams.get("tab");
            if (urlTab && tabs.some((t) => t.id === urlTab)) {
                return urlTab;
            }
        }
        return fallbackTabId;
    }, [syncWithUrl, searchParams, tabs, fallbackTabId]);

    const [activeTab, setActiveTab] = useState(() => resolveUrlTab());

    const handleTabChange = useCallback(
        (tabId: string): void => {
            setActiveTab(tabId);

            if (syncWithUrl) {
                const params = new URLSearchParams(searchParams.toString());
                params.set("tab", tabId);
                const queryString = params.toString();
                window.history.replaceState(
                    window.history.state,
                    "",
                    queryString ? `${pathname}?${queryString}` : pathname,
                );
            }
        },
        [syncWithUrl, searchParams, pathname],
    );

    const handleTabKeyDown = useCallback(
        (event: KeyboardEvent<HTMLButtonElement>, tabId: string): void => {
            const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
            if (currentIndex < 0) return;

            let nextIndex: number;
            switch (event.key) {
                case "ArrowRight":
                    nextIndex = (currentIndex + 1) % tabs.length;
                    break;
                case "ArrowLeft":
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    break;
                case "Home":
                    nextIndex = 0;
                    break;
                case "End":
                    nextIndex = tabs.length - 1;
                    break;
                default:
                    return;
            }

            event.preventDefault();
            const nextTabId = tabs.find((_, index) => index === nextIndex)?.id;
            if (!nextTabId) return;

            handleTabChange(nextTabId);
            window.requestAnimationFrame(() => {
                document
                    .getElementById(`${instanceId}-tab-${nextTabId}`)
                    ?.focus();
            });
        },
        [handleTabChange, instanceId, tabs],
    );

    const resolvedActiveTab = tabs.some((tab) => tab.id === activeTab)
        ? activeTab
        : fallbackTabId;
    const activeTabContent = tabs.find((tab) => tab.id === resolvedActiveTab)?.content;
    const activeTabButtonId = `${instanceId}-tab-${resolvedActiveTab}`;
    const tabPanelId = `${instanceId}-tabs-panel`;

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div className="w-full">
            {tabs.length > 1 && (
                <div
                    className="flex gap-2 mb-6 p-1.5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-x-auto scrollbar-hide"
                    role="tablist"
                    aria-orientation="horizontal"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            id={`${instanceId}-tab-${tab.id}`}
                            role="tab"
                            aria-selected={resolvedActiveTab === tab.id}
                            aria-controls={tabPanelId}
                            tabIndex={resolvedActiveTab === tab.id ? 0 : -1}
                            onClick={() => handleTabChange(tab.id)}
                            onKeyDown={(event) =>
                                handleTabKeyDown(event, tab.id)
                            }
                            className={`
                            flex-1 px-3 sm:px-5 py-3 font-bold text-sm sm:text-base rounded-xl transition-base duration-300 cursor-pointer border whitespace-nowrap min-w-fit relative focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none
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
