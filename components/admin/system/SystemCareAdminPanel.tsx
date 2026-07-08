"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState, useTransition } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import {
    deleteSystemAdminReferral,
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
    type SystemPhqEditFormState,
} from "./SystemCarePhqEditForm";
import { SystemCareReferralSection } from "./SystemCareReferralSection";
import {
    DeleteReasonBox,
    RecordSection,
} from "./SystemCareRecordViews";

export function SystemCareAdminPanel({
    data,
    setData,
}: {
    data: SystemCareRecordResponse;
    setData: Dispatch<SetStateAction<SystemCareRecordResponse | null>>;
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
                editTarget={phqEditTarget}
                editForm={phqEditForm}
                isPending={isPending}
                onStartEdit={(record) => {
                    setPhqEditTarget(record);
                    setPhqEditForm(createPhqEditFormState(record));
                }}
                onEditChange={(field, value) => {
                    setPhqEditForm((current) =>
                        current ? { ...current, [field]: value } : current,
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
                onDelete={() => setIsDeletingReferral(true)}
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
