export function buildStudentFilterUrl(
    path: string,
    params: Readonly<Record<string, string | string[] | undefined>>,
    removedKeys: readonly string[],
): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || removedKeys.includes(key)) continue;
        for (const entry of Array.isArray(value) ? value : [value]) {
            query.append(key, entry);
        }
    }

    return query.size > 0 ? `${path}?${query}` : path;
}
