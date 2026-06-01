import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    attachSessionCookie,
    clearSessionCookie,
    getCurrentSessionToken,
    revokeSessionToken,
    rotateCurrentSessionToken,
    signInWithPassword,
} from "@/lib/auth/session-store";

interface AuthRouteContext {
    params: Promise<{ nextauth?: string[] }>;
}

function getAction(path: string[] | undefined): string {
    return path?.[0] ?? "";
}

function notFound(): NextResponse {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
}

async function readJson(request: NextRequest): Promise<unknown> {
    try {
        return (await request.json()) as unknown;
    } catch {
        return null;
    }
}

export async function POST(
    request: NextRequest,
    context: AuthRouteContext,
): Promise<NextResponse> {
    const { nextauth } = await context.params;
    const action = getAction(nextauth);

    if (action === "signin") {
        const body = await readJson(request);
        const result = await signInWithPassword(body, (name) =>
            request.headers.get(name),
        );

        if (!result.success) {
            const status = result.code ? 429 : 401;
            return NextResponse.json(result, { status });
        }

        const response = NextResponse.json({
            success: true,
            redirectTo: result.redirectTo,
        });
        return attachSessionCookie(response, result.token);
    }

    if (action === "signout") {
        const token = await getCurrentSessionToken();
        if (token) {
            await revokeSessionToken(token);
        }

        return clearSessionCookie(NextResponse.json({ success: true }));
    }

    if (action === "rotate") {
        const rotated = await rotateCurrentSessionToken();
        if (!rotated) {
            return NextResponse.json({ success: true, rotated: false });
        }

        const response = NextResponse.json({ success: true, rotated: true });
        return attachSessionCookie(
            response,
            rotated.token,
            rotated.maxAgeSeconds,
        );
    }

    return notFound();
}

export async function GET(): Promise<NextResponse> {
    return notFound();
}
