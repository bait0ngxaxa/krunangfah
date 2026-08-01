"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { searchStudents } from "@/lib/actions/student/main";
import { actionFetcher, searchSWRConfig, swrKeys } from "@/lib/swr/config";
import { MAX_VISIBLE_RESULTS } from "./constants";
import { useState, useEffect, useRef } from "react";
import type { Student } from "./types";
import { studentRoute } from "@/lib/constants/student-routes";
import type { Dispatch, RefObject, SetStateAction } from "react";

interface StudentSearchState {
    query: string;
    setQuery: Dispatch<SetStateAction<string>>;
    results: Student[];
    isSearching: boolean;
    hasSearchError: boolean;
    queryError: { requestId: string; message?: string } | null;
    searchAccessDenied: boolean;
    retrySearch: () => void;
    handleStudentClick: (studentId: string) => void;
}

interface ScrollFadeState {
    scrollRef: RefObject<HTMLDivElement | null>;
    isScrollable: boolean;
    showFade: boolean;
}

/**
 * Hook for student search logic with SWR (replaces manual debounce).
 */
export function useStudentSearch(): StudentSearchState {
    const router = useRouter();
    const [query, setQuery] = useState("");

    // SWR with deduping replaces manual debounce
    const {
        data: searchResult,
        error,
        isValidating: isSearching,
        mutate,
    } = useSWR(
        query.trim() ? swrKeys.studentsSearch(query.trim()) : null,
        actionFetcher(() => searchStudents(query.trim())),
        {
            ...searchSWRConfig,
            keepPreviousData: true, // Show previous results while loading new ones
        },
    );

    // When query is empty, show empty results immediately (no cache)
    const results: Student[] =
        query.trim() &&
        (searchResult?.status === "success" || searchResult?.status === "empty")
            ? searchResult.data
            : [];
    const queryError =
        searchResult?.status === "transient_error"
            ? {
                  requestId: searchResult.requestId,
                  message: searchResult.message,
              }
            : null;
    const searchAccessDenied =
        searchResult?.status === "forbidden" ||
        searchResult?.status === "not_found";
    const retrySearch = useCallback((): void => {
        void mutate();
    }, [mutate]);

    const handleStudentClick = useCallback((studentId: string): void => {
        router.push(studentRoute(studentId));
    }, [router]);

    return {
        query,
        setQuery,
        results,
        isSearching,
        hasSearchError: !!error,
        queryError,
        searchAccessDenied,
        retrySearch,
        handleStudentClick,
    };
}

/**
 * Hook for scroll-fade behavior on the results list.
 */
export function useScrollFade(resultCount: number): ScrollFadeState {
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
