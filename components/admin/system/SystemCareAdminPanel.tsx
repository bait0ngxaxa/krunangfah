"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState, useTransition } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import {
    deleteSystemAdminReferral,
    resetSystemAdminActivity,
    resetSystemAdminPhq,
    saveSystemAdminPhq,
    saveSystemAdminReferral,
} from "@/lib/actions/system-admin.actions";
import type {
    SystemActivityRecord,
    SystemCareRecordResponse,
    SystemPhqRecord,
} from "@/lib/actions/system-admin/types";
import {
    type PhqFormValue,
    type ReferralFormValue,
} from "./SystemCareAdminForms";
import { SystemCareActivityGroups } from "./SystemCareActivityGroups";
import { SystemCarePhqSection } from "./SystemCarePhqSection";
import { SystemCareReferralSection } from "./SystemCareReferralSection";
import {
    DeleteReasonBox,
    RecordSection,
} from "./SystemCareRecordViews";

type FormState =
    | { type: "phq"; record: SystemPhqRecord }
    | { type: "referral" }
    | null;

export function SystemCareAdminPanel({
    studentId,
    data,
    setData,
}: {
    studentId: string;
    data: SystemCareRecordResponse;
    setData: Dispatch<SetStateAction<SystemCareRecordResponse | null>>;
}) {
    const [formState, setFormState] = useState<FormState>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [isDeletingReferral, setIsDeletingReferral] = useState(false);
    const [phqResetTarget, setPhqResetTarget] = useState<SystemPhqRecord | null>(null);
    const [phqResetReason, setPhqResetReason] = useState("");
    const [activityResetTarget, setActivityResetTarget] =
        useState<SystemActivityRecord | null>(null);
    const [activityResetReason, setActivityResetReason] = useState("");
    const [isPending, startTransition] = useTransition();

    const savePhq = (value: PhqFormValue) => {
        startTransition(async () => {
            const result = await saveSystemAdminPhq(value);
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => updatePhq(current, updated));
            setFormState(null);
            toast.success(result.message);
        });
    };

    const resetPhq = () => {
        if (!phqResetTarget) return;
        startTransition(async () => {
            const result = await resetSystemAdminPhq({
                id: phqResetTarget.id,
                reason: phqResetReason,
            });
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => resetPhqData(current, updated.deletedPhqIds));
            setPhqResetTarget(null);
            setPhqResetReason("");
            toast.success(result.message);
        });
    };

    const resetActivity = () => {
        if (!activityResetTarget) return;
        startTransition(async () => {
            const result = await resetSystemAdminActivity({
                id: activityResetTarget.id,
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

    const saveReferral = (value: ReferralFormValue) => {
        startTransition(async () => {
            const result = await saveSystemAdminReferral(value);
            const updated = result.updated;
            if (!result.success || !updated) {
                toast.error(result.message);
                return;
            }
            setData((current) => current ? { ...current, referral: updated } : current);
            setFormState(null);
            toast.success(result.message);
        });
    };

    const deleteReferral = () => {
        const referral = data.referral;
        if (!referral) return;
        startTransition(async () => {
            const result = await deleteSystemAdminReferral({
                id: referral.id,
                reason: deleteReason,
            });
            if (!result.success) {
                toast.error(result.message);
                return;
            }
            setData((current) => current ? { ...current, referral: null } : current);
            setIsDeletingReferral(false);
            setDeleteReason("");
            toast.success(result.message);
        });
    };

    return (
        <>
            <SystemCarePhqSection
                records={data.phqResults}
                editingRecord={formState?.type === "phq" ? formState.record : null}
                resetTarget={phqResetTarget}
                resetReason={phqResetReason}
                isPending={isPending}
                onEdit={(record) => {
                    setPhqResetTarget(null);
                    setFormState({ type: "phq", record });
                }}
                onSave={savePhq}
                onCancelEdit={() => setFormState(null)}
                onStartReset={(record) => {
                    setFormState(null);
                    setPhqResetTarget(record);
                    setPhqResetReason("");
                }}
                onReasonChange={setPhqResetReason}
                onCancelReset={() => setPhqResetTarget(null)}
                onReset={resetPhq}
            />

            <RecordSection
                title="กิจกรรมช่วยเหลือ"
                icon={<Activity className="h-4 w-4" />}
            >
                <SystemCareActivityGroups
                    records={data.activityProgress}
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
                studentId={studentId}
                referral={data.referral}
                teacherOptions={data.teacherOptions}
                isEditing={formState?.type === "referral"}
                isPending={isPending}
                onAdd={() => setFormState({ type: "referral" })}
                onEdit={() => setFormState({ type: "referral" })}
                onDelete={() => setIsDeletingReferral(true)}
                onCancel={() => setFormState(null)}
                onSave={saveReferral}
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

function updatePhq(
    current: SystemCareRecordResponse | null,
    record: SystemPhqRecord,
): SystemCareRecordResponse | null {
    if (!current) return current;
    return {
        ...current,
        phqResults: current.phqResults.map((item) => item.id === record.id ? record : item),
    };
}

function resetPhqData(
    current: SystemCareRecordResponse | null,
    deletedPhqIds: string[],
): SystemCareRecordResponse | null {
    if (!current) return current;
    const deletedSet = new Set(deletedPhqIds);
    return {
        ...current,
        phqResults: current.phqResults.filter((item) => !deletedSet.has(item.id)),
        activityProgress: current.activityProgress.filter(
            (item) => !deletedSet.has(item.phqResultId),
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
