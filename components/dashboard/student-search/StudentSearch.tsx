"use client";

import { useStudentSearch, useScrollFade } from "./useStudentSearch";
import { SearchInput } from "./SearchInput";
import { EmptyState } from "./EmptyState";
import { SearchResultsList } from "./SearchResultsList";

export function StudentSearch() {
    const { query, setQuery, results, isSearching, handleStudentClick } =
        useStudentSearch();
    const { scrollRef, isScrollable, showFade } = useScrollFade(results.length);

    const hasQuery = query.trim().length > 0;

    return (
        <div>
            <SearchInput
                query={query}
                onQueryChange={setQuery}
                isSearching={isSearching}
            />

            <EmptyState
                hasQuery={hasQuery}
                isSearching={isSearching}
                resultCount={results.length}
            />

            <SearchResultsList
                results={results}
                scrollRef={scrollRef}
                isScrollable={isScrollable}
                showFade={showFade}
                onStudentClick={handleStudentClick}
            />
        </div>
    );
}
