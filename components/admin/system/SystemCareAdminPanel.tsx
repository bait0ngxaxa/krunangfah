"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState, useTransition } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import {
    deleteSystemAdminReferral,
    getSystemStudentCareRecords,
    resetSystemAdminActivity,
    updateSystemAdminPhq,
} from "@/lib/actions/system-admin.actions";
import type {
    SystemActivityRecord,
    SystemCareRecordResponse,
    SystemPhqRecord,
} from "@/lib/actions/system-admin/types";
import { SystemCareActivityGroups } from "./SystemCareActivityGroups";
import { SystemCarePhqSection } from "./SystemCarePhqSection";
import {
    createPhqEditFormState,
    normalizePhqEditFormState,
    type SystemPhqEditFormState,
} from "./SystemCarePhqEditForm";
import { SystemCareReferralSection } from "./SystemCareReferralSection";
import {
    DeleteReasonBox,
    RecordSection,
} from "./SystemCareRecordViews";

export function SystemCareAdminPanel({
    studentId,
    data,
    setData,
    allowMutations,
}: {
    studentId: string;
    data: SystemCareRecordResponse;
    setData: Dispatch<SetStateAction<SystemCareRecordResponse | null>>;
    allowMutations: boolean;
}) {
    const [deleteReason, setDeleteReason] = useState("");
    const [isDeletingReferral, setIsDeletingReferral] = useState(false);
    const [phqEditTarget, setPhqEditTarget] = useState<SystemPhqRecord | null>(null);
    const [phqEditForm, setPhqEditForm] =
        useState<SystemPhqEditFormState | null>(null);
    const [activityResetTarget, setActivityResetTarget] =
        useState<SystemActivityRecord | null>(null);
    const [activityResetReason, setActivityResetReason] = useState("");
    const [isPending, startTransition] = useTransition();

    const savePhq = () => {
        if (!phqEditTarget || !phqEditForm) return;
        startTransition(async () => {
            const result = await updateSystemAdminPhq({
                id: phqEditTarget.id,
                expectedUpdatedAt: phqEditTarget.updatedAt,
                ...phqEditForm,
            });
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => updatePhqData(current, updated));
            setPhqEditTarget(null);
            setPhqEditForm(null);
            toast.success(result.message);
        });
    };

    const resetActivity = () => {
        if (!activityResetTarget) return;
        startTransition(async () => {
            const result = await resetSystemAdminActivity({
                id: activityResetTarget.id,
                expectedUpdatedAt: activityResetTarget.updatedAt,
                reason: activityResetReason,
            });
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => resetActivityData(current, updated));
            setActivityResetTarget(null);
            setActivityResetReason("");
            toast.success(result.message);
        });
    };

    const deleteReferral = () => {
        const referral = data.referral;
        if (!referral) return;
        startTransition(async () => {
            const result = await deleteSystemAdminReferral({
                id: referral.id,
                expectedUpdatedAt: referral.updatedAt,
                reason: deleteReason,
            });
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            const refreshed = await getSystemStudentCareRecords({ studentId });
            if (refreshed) {
                setData(refreshed);
            } else {
                setData((current) =>
                    markReferralRevoked(current, referral.id, deleteReason),
                );
            }
            setIsDeletingReferral(false);
            setDeleteReason("");
            toast.success(result.message);
        });
    };

    return (
        <>
            <SystemCarePhqSection
                records={data.phqResults}
                editTarget={phqEditTarget}
                editForm={phqEditForm}
                isPending={isPending}
                allowMutations={allowMutations}
                onStartEdit={(record) => {
                    setPhqEditTarget(record);
                    setPhqEditForm(createPhqEditFormState(record));
                }}
                onEditChange={(field, value) => {
                    setPhqEditForm((current) =>
                        current
                            ? normalizePhqEditFormState({ ...current, [field]: value })
                            : current,
                    );
                }}
                onCancelEdit={() => {
                    setPhqEditTarget(null);
                    setPhqEditForm(null);
                }}
                onSaveEdit={savePhq}
            />

            <RecordSection
                title="กิจกรรมช่วยเหลือ"
                icon={<Activity className="h-4 w-4" />}
            >
                <SystemCareActivityGroups
                    records={data.activityProgress}
                    allowMutations={allowMutations}
                    resetTarget={activityResetTarget}
                    resetReason={activityResetReason}
                    isPending={isPending}
                    onStartReset={(record) => {
                        setActivityResetTarget(record);
                        setActivityResetReason("");
                    }}
                    onReasonChange={setActivityResetReason}
                    onCancelReset={() => setActivityResetTarget(null)}
                    onReset={resetActivity}
                />
            </RecordSection>

            <SystemCareReferralSection
                referral={data.referral}
                referralHistory={data.referralHistory}
                onDelete={allowMutations ? () => setIsDeletingReferral(true) : undefined}
            />
            {isDeletingReferral ? (
                <DeleteReasonBox
                    title="ลบการส่งต่อ"
                    buttonLabel="ลบการส่งต่อ"
                    value={deleteReason}
                    isPending={isPending}
                    onChange={setDeleteReason}
                    onCancel={() => setIsDeletingReferral(false)}
                    onDelete={deleteReferral}
                />
            ) : null}
        </>
    );
}

function markReferralRevoked(
    current: SystemCareRecordResponse | null,
    referralId: string,
    reason: string,
): SystemCareRecordResponse | null {
    if (!current) return current;
    return {
        ...current,
        referral: null,
        referralHistory: current.referralHistory.map((record) =>
            record.id === referralId
                ? {
                      ...record,
                      status: "revoked",
                      revokedAt: new Date(),
                      revokedById: null,
                      revokedByName: null,
                      revokeReason: reason.trim() || record.revokeReason,
                  }
                : record,
        ),
    };
}

function updatePhqData(
    current: SystemCareRecordResponse | null,
    record: SystemPhqRecord,
): SystemCareRecordResponse | null {
    if (!current) return current;
    return {
        ...current,
        phqResults: current.phqResults.map((item) =>
            item.id === record.id ? record : item,
        ),
    };
}

function resetActivityData(
    current: SystemCareRecordResponse | null,
    record: SystemActivityRecord,
): SystemCareRecordResponse | null {
    if (!current) return current;
    return {
        ...current,
        activityProgress: current.activityProgress.map((item) => {
            if (item.id === record.id) return record;
            if (
                item.phqResultId === record.phqResultId &&
                item.activityNumber > record.activityNumber
            ) {
                return {
                    ...item,
                    status: "locked",
                    scheduledDate: null,
                    completedAt: null,
                    teacherId: null,
                    teacherName: null,
                    teacherNotes: null,
                    internalProblems: null,
                    externalProblems: null,
                    problemType: null,
                };
            }
            return item;
        }),
    };
}
