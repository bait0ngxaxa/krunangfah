import { createHash } from "crypto";
import { extractClientIp, TRUSTED_PROXY_HEADERS } from "@/lib/rate-limit";

const UNKNOWN_DEVICE_LABEL = "อุปกรณ์ไม่ทราบชนิด";

export type HeaderGetter = (name: string) => string | null;

export interface SessionMetadata {
    userAgentLabel: string;
    userAgentHash: string | null;
    lastIpPrefix: string | null;
}

function hashText(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function getBrowserName(userAgent: string): string {
    if (/Edg\//.test(userAgent)) return "Microsoft Edge";
    if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) {
        return "Chrome";
    }
    if (/Firefox\//.test(userAgent)) return "Firefox";
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
        return "Safari";
    }
    return "Browser";
}

function getDeviceName(userAgent: string): string {
    if (/iPhone|Android.+Mobile/.test(userAgent)) return "มือถือ";
    if (/iPad|Tablet|Android/.test(userAgent)) return "แท็บเล็ต";
    return "คอมพิวเตอร์";
}

function getUserAgentLabel(userAgent: string | null): string {
    if (!userAgent) return UNKNOWN_DEVICE_LABEL;
    return `${getBrowserName(userAgent)} บน${getDeviceName(userAgent)}`;
}

export function getSessionMetadata(headerGetter: HeaderGetter): SessionMetadata {
    const userAgent = headerGetter("user-agent");
    const clientIp = extractClientIp(headerGetter, TRUSTED_PROXY_HEADERS);

    return {
        userAgentLabel: getUserAgentLabel(userAgent),
        userAgentHash: userAgent ? hashText(userAgent) : null,
        lastIpPrefix: clientIp === "unknown" ? null : clientIp,
    };
}
