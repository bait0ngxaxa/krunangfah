import { isRiskLevel } from "@/lib/constants/risk-levels";
import { UNSCREENED_THIS_YEAR_PARAM } from "@/lib/constants/student-filters";
import type { DashboardRiskFilter } from "./types";

export type DashboardParamKey =
    | "school"
    | "class"
    | "page"
    | "risk"
    | "referred"
    | "year"
    | "round"
    | "unscreened";
export type DashboardFilterUpdates = Partial<
    Record<DashboardParamKey, string | null>
>;

export interface DashboardFilterState {
    schoolId: string;
    className: string;
    riskFilter: DashboardRiskFilter;
    referredOnly: boolean;
    /** Academic-year id, or "" for the latest-result view. */
    termId: string;
    /** "1" / "2", or "" for every round. */
    round: string;
    /** `unscreened=year`; only meaningful without a selected term. */
    unscreenedOnly: boolean;
}

function resolveOptionalFilter(value: string | null): string {
    if (!value || value === "all") {
        return "";
    }
    return value;
}

function resolveRiskFilter(value: string | null): DashboardRiskFilter {
    if (!value || value === "all") {
        return "all";
    }

    return isRiskLevel(value) ? value : "all";
}

function pick<T>(update: string | null | undefined, current: T, resolve: (value: string | null) => T): T {
    return update === undefined ? current : resolve(update);
}

export function applyDashboardFilterUpdates(
    current: DashboardFilterState,
    updates: DashboardFilterUpdates,
): DashboardFilterState {
    return {
        schoolId: pick(updates.school, current.schoolId, resolveOptionalFilter),
        className: pick(
            updates.class,
            current.className,
            (value) => resolveOptionalFilter(value) || "all",
        ),
        riskFilter: pick(updates.risk, current.riskFilter, resolveRiskFilter),
        referredOnly: pick(
            updates.referred,
            current.referredOnly,
            (value) => value === "true",
        ),
        termId: pick(updates.year, current.termId, resolveOptionalFilter),
        round: pick(updates.round, current.round, resolveOptionalFilter),
        unscreenedOnly: pick(
            updates.unscreened,
            current.unscreenedOnly,
            (value) => value === UNSCREENED_THIS_YEAR_PARAM,
        ),
    };
}

function setOptionalParam(
    params: URLSearchParams,
    key: DashboardParamKey,
    value: string,
): void {
    if (!value || value === "all") {
        params.delete(key);
        return;
    }
    params.set(key, value);
}

/**
 * Next query string for the students page. Unrelated params already in the
 * URL are kept; `page` changes only when the update names it.
 */
export function buildDashboardQueryString(
    currentParams: URLSearchParams,
    filters: DashboardFilterState,
    updates: DashboardFilterUpdates,
): string {
    const params = new URLSearchParams(currentParams.toString());
    setOptionalParam(params, "school", filters.schoolId);
    setOptionalParam(params, "class", filters.className);
    setOptionalParam(params, "risk", filters.riskFilter);
    setOptionalParam(params, "referred", filters.referredOnly ? "true" : "");
    setOptionalParam(params, "year", filters.termId);
    setOptionalParam(params, "round", filters.round);
    // Mutually exclusive with a term: never emit both.
    setOptionalParam(
        params,
        "unscreened",
        filters.unscreenedOnly && !filters.termId ? UNSCREENED_THIS_YEAR_PARAM : "",
    );
    if (updates.page !== undefined) {
        setOptionalParam(params, "page", updates.page ?? "");
    }
    return params.toString();
}

/**
 * Changing the term resets the round and page; other filters stay, except
 * `unscreened`, which only exists in the latest-result view.
 */
export function termChangeUpdates(termId: string): DashboardFilterUpdates {
    return { year: termId || null, round: null, page: null, unscreened: null };
}

export function unscreenedToggleUpdates(
    isActive: boolean,
): DashboardFilterUpdates {
    return {
        page: null,
        unscreened: isActive ? null : UNSCREENED_THIS_YEAR_PARAM,
    };
}

export function roundChangeUpdates(round: string): DashboardFilterUpdates {
    return { round: round || null, page: null };
}
