type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|cookie/i;
const EMAIL_PATTERN =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const LONG_SECRET_PATTERN = /\b[a-f0-9]{32,}\b|[A-Za-z0-9-_]{24,}\.[A-Za-z0-9-_]{12,}\.[A-Za-z0-9-_]{12,}/i;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function redactSensitiveString(input: string): string {
    if (EMAIL_PATTERN.test(input)) {
        return "[REDACTED_EMAIL]";
    }
    if (LONG_SECRET_PATTERN.test(input)) {
        return "[REDACTED_SECRET]";
    }
    return input;
}

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
        if (typeof value === "string") {
            return redactSensitiveString(value);
        }
        return value;
    }

    if (value instanceof Error) {
        const errorObject: { [key: string]: JsonValue } = {
            name: value.name,
        };

        // Error messages often include runtime values; hide in production logs.
        if (!IS_PRODUCTION) {
            errorObject.message = redactSensitiveString(value.message);
        }

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
            sanitized[key] =
                typeof nested === "string"
                    ? redactSensitiveString(nested)
                    : sanitizeValue(nested, depth + 1);
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

    if (IS_PRODUCTION) {
        const context =
            typeof args[0] === "string"
                ? redactSensitiveString(args[0])
                : "Application error";
        const productionPayload = {
            context,
            details:
                Array.isArray(payload) && payload.length > 1
                    ? payload.slice(1)
                    : payload,
        };
        console.error(JSON.stringify(productionPayload));
        return;
    }

    console.error(JSON.stringify(payload));
}
