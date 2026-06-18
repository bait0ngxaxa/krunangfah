"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    getStudentActionBlockedMessage,
    parseStudentStatusValue,
    STUDENT_STATUS,
    type StudentStatusValue,
} from "@/lib/constants/student-status";

interface StudentStatusContextValue {
    initialStatus: StudentStatusValue;
    status: StudentStatusValue;
    setStatus: (status: StudentStatusValue) => void;
    initialStatusLockedMessage: string | null;
    statusLockedMessage: string | null;
}

interface StudentStatusProviderProps {
    initialStatus?: string | null;
    children: ReactNode;
}

interface StudentStatusLock {
    actionLockedMessage?: string;
    isLockedByStatus: boolean;
}

const StudentStatusContext =
    createContext<StudentStatusContextValue | null>(null);

function normalizeStudentStatus(status?: string | null): StudentStatusValue {
    return parseStudentStatusValue(status) ?? STUDENT_STATUS.ACTIVE;
}

export function StudentStatusProvider({
    initialStatus,
    children,
}: StudentStatusProviderProps) {
    const normalizedInitialStatus = normalizeStudentStatus(initialStatus);
    const [status, setStatus] = useState(normalizedInitialStatus);

    const value = useMemo<StudentStatusContextValue>(
        () => ({
            initialStatus: normalizedInitialStatus,
            status,
            setStatus,
            initialStatusLockedMessage: getStudentActionBlockedMessage(
                normalizedInitialStatus,
            ),
            statusLockedMessage: getStudentActionBlockedMessage(status),
        }),
        [normalizedInitialStatus, status],
    );

    return (
        <StudentStatusContext.Provider value={value}>
            {children}
        </StudentStatusContext.Provider>
    );
}

export function useStudentStatusContext(): StudentStatusContextValue | null {
    return useContext(StudentStatusContext);
}

export function useStudentStatusLock(
    serverLockedMessage?: string,
): StudentStatusLock {
    const context = useStudentStatusContext();
    if (!context) {
        return {
            actionLockedMessage: serverLockedMessage,
            isLockedByStatus: false,
        };
    }

    const isStaleInitialStatusMessage =
        context.initialStatusLockedMessage !== null &&
        serverLockedMessage === context.initialStatusLockedMessage;
    const fallbackMessage = isStaleInitialStatusMessage
        ? undefined
        : serverLockedMessage;

    return {
        actionLockedMessage: context.statusLockedMessage ?? fallbackMessage,
        isLockedByStatus: context.statusLockedMessage !== null,
    };
}
