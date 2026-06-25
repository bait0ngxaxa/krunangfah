import { NextResponse, type NextRequest } from "next/server";

import { createNamedSubmissionExport } from "@/lib/exports/named-submission/service";
import { parseNamedSubmissionFilters } from "@/lib/exports/named-submission/validation";
import { requireAdmin, requirePrimaryAdmin } from "@/lib/session";
import { logError } from "@/lib/utils/logging";
import type { NamedSubmissionFilters } from "@/lib/exports/named-submission/types";

export const dynamic = "force-dynamic";

function getFilterInput(request: NextRequest): Record<string, string | undefined> {
    const { searchParams } = new URL(request.url);

    return {
        school: searchParams.get("school") ?? undefined,
        class: searchParams.get("class") ?? undefined,
        year: searchParams.get("year") ?? undefined,
        semester: searchParams.get("semester") ?? undefined,
        round: searchParams.get("round") ?? undefined,
    };
}

function createDownloadResponse(content: Uint8Array, filename: string): NextResponse {
    const encodedFilename = encodeURIComponent(filename);
    const body = new Uint8Array(content.byteLength);
    body.set(content);

    return new NextResponse(body.buffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="named-submission.xlsx"; filename*=UTF-8''${encodedFilename}`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

async function resolveAuthorizedFilters(
    filters: NamedSubmissionFilters,
): Promise<NamedSubmissionFilters | null> {
    try {
        await requireAdmin();
        return filters.schoolId ? filters : null;
    } catch {
        const session = await requirePrimaryAdmin();
        const schoolId = session.user.schoolId;

        if (!schoolId) {
            throw new Error("Primary school admin has no school");
        }

        return { ...filters, schoolId };
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const parsedFilters = parseNamedSubmissionFilters(getFilterInput(request));
    if (!parsedFilters.success) {
        return NextResponse.json({ error: "ตัวกรองไม่ถูกต้อง" }, { status: 400 });
    }

    let authorizedFilters: NamedSubmissionFilters | null;
    try {
        authorizedFilters = await resolveAuthorizedFilters(parsedFilters.data);
    } catch {
        return NextResponse.json({ error: "ไม่มีสิทธิ์ส่งออกรายชื่อ" }, { status: 403 });
    }

    if (!authorizedFilters) {
        return NextResponse.json(
            { error: "กรุณาเลือกโรงเรียนก่อนส่งออกรายชื่อ" },
            { status: 400 },
        );
    }

    try {
        const exportResult = await createNamedSubmissionExport(authorizedFilters);
        if (!exportResult.content) {
            return NextResponse.json(
                { error: "ไม่พบข้อมูลผลคัดกรองตามตัวกรองที่เลือก" },
                { status: 404 },
            );
        }

        return createDownloadResponse(exportResult.content, exportResult.filename ?? "named-submission.xlsx");
    } catch (error) {
        logError("Named submission export failed", error);
        return NextResponse.json({ error: "ไม่สามารถส่งออกรายชื่อได้" }, { status: 500 });
    }
}
