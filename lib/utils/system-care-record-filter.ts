import type { SystemCareRecordResponse } from "@/lib/actions/system-admin/types";

export function filterSystemCareRecords(
    data: SystemCareRecordResponse,
    phqResultId: string,
): SystemCareRecordResponse {
    const selectedPhq = data.phqResults.find((record) => record.id === phqResultId);
    if (!selectedPhq) return data;
    return {
        ...data,
        phqResults: [selectedPhq],
        activityProgress: data.activityProgress.filter(
            (record) => record.phqResultId === selectedPhq.id,
        ),
        counselingSessions: data.counselingSessions.filter(
            (record) => record.academicYearId === selectedPhq.academicYearId,
        ),
        homeVisits: data.homeVisits.filter(
            (record) => record.academicYearId === selectedPhq.academicYearId,
        ),
    };
}
