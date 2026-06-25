import { createNamedSubmissionFilename } from "./filename";
import { mapNamedSubmissionRecord } from "./mapper";
import { getNamedSubmissionRecords } from "./query";
import type { NamedSubmissionFilters } from "./types";
import { createNamedSubmissionWorkbook } from "./workbook";

export interface NamedSubmissionExportResult {
    content: Uint8Array | null;
    filename: string | null;
    rowCount: number;
}

export async function createNamedSubmissionExport(
    filters: NamedSubmissionFilters,
): Promise<NamedSubmissionExportResult> {
    const records = await getNamedSubmissionRecords(filters);
    if (records.length === 0) {
        return { content: null, filename: null, rowCount: 0 };
    }

    const rows = records.map(mapNamedSubmissionRecord);

    return {
        content: await createNamedSubmissionWorkbook(rows),
        filename: createNamedSubmissionFilename(records, filters),
        rowCount: rows.length,
    };
}
