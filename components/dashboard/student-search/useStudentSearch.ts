"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { searchStudents } from "@/lib/actions/student";
import { actionFetcher, searchSWRConfig, swrKeys } from "@/lib/swr/config";
import { MAX_VISIBLE_RESULTS } from "./constants";
import { useState, useEffect, useRef } from "react";
import type { Student } from "./types";

/**
 * Hook for student search logic with SWR (replaces manual debounce).
 */
export function useStudentSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");

    // SWR with deduping replaces manual debounce
    const { data: swrResults = [], isValidating: isSearching } = useSWR(
        query.trim() ? swrKeys.studentsSearch(query.trim()) : null,
        actionFetcher(() => searchStudents(query.trim())),
        {
            ...searchSWRConfig,
            keepPreviousData: true, // Show previous results while loading new ones
        },
    );

    // When query is empty, show empty results immediately (no cache)
    const results = query.trim() ? (swrResults as Student[]) : [];

    const handleStudentClick = useCallback((studentId: string): void => {
        router.push(`/students/${studentId}`);
    }, [router]);

    return { query, setQuery, results, isSearching, handleStudentClick };
}

/**
 * Hook for scroll-fade behavior on the results list.
 */
export function useScrollFade(resultCount: number) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);

    const isScrollable = resultCount > MAX_VISIBLE_RESULTS;
    const showFade = isScrollable && !scrolledToBottom;

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
        setScrolledToBottom(distanceFromBottom <= 8);
    }, []);

    useEffect(() => {
        if (!isScrollable) return;
        const el = scrollRef.current;
        if (!el) return;
        const rafId = requestAnimationFrame(() => checkScroll());
        el.addEventListener("scroll", checkScroll, { passive: true });
        return () => {
            cancelAnimationFrame(rafId);
            el.removeEventListener("scroll", checkScroll);
        };
    }, [isScrollable, checkScroll, resultCount]);

    return { scrollRef, isScrollable, showFade };
}
