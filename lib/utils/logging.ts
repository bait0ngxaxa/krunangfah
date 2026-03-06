type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|cookie/i;

function sanitizeValue(value: unknown, depth = 0): JsonValue {
    if (depth > 3) {
        return "[MaxDepth]";
    }

    if (value === null || value === undefined) {
        return null;
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (value instanceof Error) {
        const errorObject: { [key: string]: JsonValue } = {
            name: value.name,
            message: value.message,
        };

        const withCode = value as Error & { code?: unknown };
        if (
            typeof withCode.code === "string" ||
            typeof withCode.code === "number"
        ) {
            errorObject.code = String(withCode.code);
        }

        return errorObject;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, depth + 1));
    }

    if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        const sanitized: { [key: string]: JsonValue } = {};

        for (const [key, nested] of Object.entries(record)) {
            if (SENSITIVE_KEY_PATTERN.test(key)) {
                // eslint-disable-next-line security/detect-object-injection -- key comes from Object.entries(record) of current object
                sanitized[key] = "[REDACTED]";
                continue;
            }
            // eslint-disable-next-line security/detect-object-injection -- key comes from Object.entries(record) of current object
            sanitized[key] = sanitizeValue(nested, depth + 1);
        }

        return sanitized;
    }

    return String(value);
}

function toSerializable(args: unknown[]): JsonValue {
    if (args.length === 1) {
        return sanitizeValue(args[0]);
    }
    return args.map((arg) => sanitizeValue(arg));
}

/**
 * Log sanitized error payloads to avoid leaking sensitive internals.
 */
export function logError(...args: unknown[]): void {
    const payload = toSerializable(args);
    console.error(JSON.stringify(payload));
}
