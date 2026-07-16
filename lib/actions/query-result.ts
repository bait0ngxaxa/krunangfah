export type QueryResult<T> =
    | { status: "success"; data: T }
    | { status: "empty"; data: T }
    | { status: "forbidden" }
    | { status: "not_found" }
    | { status: "transient_error"; requestId: string };

export function querySuccess<T>(data: T): QueryResult<T> {
    return { status: "success", data };
}

export function queryEmpty<T>(data: T): QueryResult<T> {
    return { status: "empty", data };
}
