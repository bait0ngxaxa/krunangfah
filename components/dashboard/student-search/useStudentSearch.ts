"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchStudents } from "@/lib/actions/student";
import { MAX_VISIBLE_RESULTS } from "./constants";
import type { Student } from "./types";

/**
 * Hook for student search logic with debounced server action.
 */
export function useStudentSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            const students = await searchStudents(query.trim());
            setResults(students as Student[]);
            setIsSearching(false);
        };

        const timeoutId = setTimeout(performSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleStudentClick = (studentId: string): void => {
        router.push(`/students/${studentId}`);
    };

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
