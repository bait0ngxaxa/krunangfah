"use client";

import { useStudentStatusLock } from "@/components/student/profile/StudentStatusContext";
import { ScheduleDateCell } from "./ScheduleDateCell";

interface StatusAwareScheduleDateCellProps {
    activityProgressId: string;
    currentDate: Date | null;
    isLocked: boolean;
    readOnly?: boolean;
}

export function StatusAwareScheduleDateCell({
    activityProgressId,
    currentDate,
    isLocked,
    readOnly = false,
}: StatusAwareScheduleDateCellProps) {
    const { isLockedByStatus } = useStudentStatusLock();

    return (
        <ScheduleDateCell
            activityProgressId={activityProgressId}
            currentDate={currentDate}
            isLocked={isLocked}
            readOnly={readOnly || isLockedByStatus}
        />
    );
}
