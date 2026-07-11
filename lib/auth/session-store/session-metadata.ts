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

function getIpPrefix(ip: string): string | null {
    if (ip === "unknown") return null;

    if (ip.includes(".")) {
        const parts = ip.split(".");
        return parts.length === 4 ? `${parts.slice(0, 3).join(".")}.0/24` : null;
    }

    if (ip.includes(":")) {
        const groups = ip.split(":").filter(Boolean).slice(0, 4);
        return groups.length > 0 ? `${groups.join(":")}::/64` : null;
    }

    return null;
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
    return {
        userAgentLabel: getUserAgentLabel(userAgent),
        userAgentHash: userAgent ? hashText(userAgent) : null,
        lastIpPrefix: getIpPrefix(
            extractClientIp(headerGetter, TRUSTED_PROXY_HEADERS),
        ),
    };
}
