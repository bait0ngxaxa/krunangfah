import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
    namedSubmissionSelect,
    type NamedSubmissionFilters,
    type NamedSubmissionRecord,
} from "./types";

const EXPORT_PAGE_SIZE = 500;

function buildNamedSubmissionWhere(
    filters: NamedSubmissionFilters,
): Prisma.PhqResultWhereInput {
    return {
        ...(filters.assessmentRound !== undefined
            ? { assessmentRound: filters.assessmentRound }
            : {}),
        student: {
            ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
            ...(filters.className ? { class: filters.className } : {}),
        },
        ...(filters.academicYear !== undefined || filters.semester !== undefined
            ? {
                  academicYear: {
                      ...(filters.academicYear !== undefined
                          ? { year: filters.academicYear }
                          : {}),
                      ...(filters.semester !== undefined
                          ? { semester: filters.semester }
                          : {}),
                  },
              }
            : {}),
    };
}

export async function getNamedSubmissionRecords(
    filters: NamedSubmissionFilters,
): Promise<NamedSubmissionRecord[]> {
    const records: NamedSubmissionRecord[] = [];
    const where = buildNamedSubmissionWhere(filters);
    let cursor: string | undefined;

    do {
        const page = await prisma.phqResult.findMany({
            where,
            select: namedSubmissionSelect,
            orderBy: { id: "asc" },
            take: EXPORT_PAGE_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        records.push(...page);
        cursor = page.at(-1)?.id;
    } while (cursor !== undefined);

    return records;
}
