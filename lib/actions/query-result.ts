export type QueryResult<T> =
    | { status: "success"; data: T }
    | { status: "empty"; data: T }
    | { status: "forbidden"; message?: string }
    | { status: "not_found"; message?: string }
    | { status: "transient_error"; requestId: string; message?: string };

export const QUERY_ERROR_MESSAGE =
    "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง";

export function querySuccess<T>(data: T): QueryResult<T> {
    return { status: "success", data };
}

export function queryEmpty<T>(data: T): QueryResult<T> {
    return { status: "empty", data };
}

export function queryForbidden<T>(message?: string): QueryResult<T> {
    return message
        ? { status: "forbidden", message }
        : { status: "forbidden" };
}

export function queryNotFound<T>(message?: string): QueryResult<T> {
    return message
        ? { status: "not_found", message }
        : { status: "not_found" };
}
