// SWR fetcher for Server Actions
type FetcherFunction<T> = () => Promise<T | null>;

export const actionFetcher = <T>(action: FetcherFunction<T>) => async (): Promise<T | null> => {
    try {
        return await action();
    } catch (error) {
        console.error("SWR fetch error:", error);
        throw error;
    }
};

// SWR Key types for type safety
export interface AnalyticsFilters {
    classFilter?: string;
    schoolFilter?: string;
    yearFilter?: number;
}

// SWR Keys with proper typing
export const swrKeys = {
    analytics: (filters: AnalyticsFilters): [string, AnalyticsFilters] => [
        "analytics",
        filters,
    ],
    
    studentsSearch: (query: string): [string, string, string] => [
        "students",
        "search",
        query,
    ],
    
    academicYears: (): [string] => ["academic-years"],
} as const;

// Default SWR config
export const defaultSWRConfig = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000, // 2 seconds
    errorRetryCount: 3,
    errorRetryInterval: 5000, // 5 seconds
};

// Config for search endpoints (shorter deduping)
export const searchSWRConfig = {
    ...defaultSWRConfig,
    dedupingInterval: 300, // 300ms for search
    keepPreviousData: true,
};
