"use client";

import { useStudentSearch, useScrollFade } from "./useStudentSearch";
import { SearchInput } from "./SearchInput";
import { EmptyState } from "./EmptyState";
import { SearchResultsList } from "./SearchResultsList";
import { QueryErrorState } from "@/components/ui/QueryErrorState";

interface StudentSearchProps {
    canSearchNationalId?: boolean;
}

export function StudentSearch({
    canSearchNationalId = false,
}: StudentSearchProps) {
    const {
        query,
        setQuery,
        results,
        isSearching,
        hasSearchError,
        queryError,
        searchAccessDenied,
        retrySearch,
        handleStudentClick,
    } = useStudentSearch();
    const { scrollRef, isScrollable, showFade } = useScrollFade(results.length);

    const hasQuery = query.trim().length > 0;

    return (
        <div>
            <SearchInput
                query={query}
                onQueryChange={setQuery}
                isSearching={isSearching}
                canSearchNationalId={canSearchNationalId}
            />

            {queryError ? (
                <QueryErrorState
                    requestId={queryError.requestId}
                    message={queryError.message}
                    onRetry={retrySearch}
                />
            ) : searchAccessDenied ? (
                <div
                    className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-center text-sm font-semibold text-amber-800"
                    role="alert"
                >
                    ไม่มีสิทธิ์ค้นหาข้อมูลนักเรียน
                </div>
            ) : (
                <EmptyState
                    hasQuery={hasQuery}
                    isSearching={isSearching}
                    hasError={hasSearchError}
                    resultCount={results.length}
                />
            )}

            {!queryError && !searchAccessDenied && (
                <SearchResultsList
                    results={results}
                    scrollRef={scrollRef}
                    isScrollable={isScrollable}
                    showFade={showFade}
                    onStudentClick={handleStudentClick}
                    canViewNationalId={canSearchNationalId}
                />
            )}
        </div>
    );
}
