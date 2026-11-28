/**
 * Integration Test: Postgres evaluates the attribution SQL fragment to the
 * same class as the TypeScript rule for every term × snapshot combination.
 * Reads only literal VALUES rows, so it touches no table.
 */

import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/database/prisma";
import {
    attributeResultClass,
    buildAttributedClassSql,
} from "@/lib/utils/class-attribution";

const COMBINATIONS = [
    { isCurrentTerm: true, snapshotClassName: "ม.1/1", currentClassName: "ม.2/1" },
    { isCurrentTerm: true, snapshotClassName: null, currentClassName: "ม.2/1" },
    { isCurrentTerm: false, snapshotClassName: "ม.1/1", currentClassName: "ม.2/1" },
    { isCurrentTerm: false, snapshotClassName: null, currentClassName: "ม.2/2" },
];

describe("Integration: attribution SQL fragment agrees with the TypeScript rule", () => {
    it.each(COMBINATIONS)(
        "isCurrent=$isCurrentTerm snapshot=$snapshotClassName",
        async (input) => {
            const rows = await prisma.$queryRaw<Array<{ attributed: string }>>`
                SELECT ${buildAttributedClassSql()} AS attributed
                FROM (VALUES (${input.snapshotClassName}::text)) AS pr("className"),
                     (VALUES (${input.currentClassName}::text)) AS s(class),
                     (VALUES (${input.isCurrentTerm}::boolean)) AS ay("isCurrent")
            `;

            expect(rows).toEqual([
                { attributed: attributeResultClass(input).className },
            ]);
        },
    );
});
