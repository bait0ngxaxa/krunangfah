type RouteQueryValue = string | number | null | undefined;

function buildRouteWithQuery(
    path: string,
    query: Record<string, RouteQueryValue>,
): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === null || value === undefined || value === "") {
            continue;
        }
        params.set(key, String(value));
    }

    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
}

export function studentRoute(studentId: string): string {
    return `/students/${studentId}`;
}

export function studentHelpRoute(studentId: string): string {
    return `${studentRoute(studentId)}/help`;
}

export function studentHelpConversationRoute(studentId: string): string {
    return `${studentHelpRoute(studentId)}/conversation`;
}

export function studentHelpGuidelinesRoute(
    studentId: string,
    phqResultId?: string,
): string {
    return buildRouteWithQuery(`${studentHelpRoute(studentId)}/guidelines`, {
        phqResultId,
    });
}

export function studentHelpStartRoute(
    studentId: string,
    phqResultId?: string,
): string {
    return buildRouteWithQuery(`${studentHelpRoute(studentId)}/start`, {
        phqResultId,
    });
}

export function studentHelpAssessmentRoute(
    studentId: string,
    activity: number,
    phqResultId?: string,
): string {
    return buildRouteWithQuery(`${studentHelpStartRoute(studentId)}/assessment`, {
        activity,
        phqResultId,
    });
}

export function studentHelpEncouragementRoute(
    studentId: string,
    activity: number,
    options?: {
        phqResultId?: string;
        type?: "internal" | "external";
    },
): string {
    return buildRouteWithQuery(`${studentHelpStartRoute(studentId)}/encouragement`, {
        activity,
        phqResultId: options?.phqResultId,
        type: options?.type,
    });
}

