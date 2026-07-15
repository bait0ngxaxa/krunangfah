import {
    ArchiveRestore,
    Check,
    ShieldAlert,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EventRow } from "./EventRow";
import { ImpactGrid } from "./ImpactGrid";
import { StatusPills } from "./StatusPills";
import {
    getPermanentDeleteEligibilityMessage,
    isPermanentDeleteEligible,
} from "./types";
import type { ManagedActionKey, ManagedPreview } from "./types";

export function DetailPanel({
    preview,
    onAction,
}: {
    preview: ManagedPreview;
    onAction: (action: ManagedActionKey) => void;
}) {
    const title =
        preview.type === "school"
            ? preview.name
            : `${preview.firstName} ${preview.lastName}`;
    const canRestore = Boolean(preview.disabledAt);
    const canDeletePermanently = isPermanentDeleteEligible(preview);
    const isDisableBlocked = !canRestore && preview.isTestData;
    const isMarkTestBlocked = canRestore && !preview.isTestData;

    return (
        <div className="space-y-4">
            <div>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold text-emerald-700">
                            {preview.type === "school" ? "โรงเรียน" : "นักเรียน"}
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-gray-900">
                            {title}
                        </h2>
                    </div>
                    <StatusPills
                        disabledAt={preview.disabledAt}
                        isTestData={preview.isTestData}
                    />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                    {preview.type === "school"
                        ? preview.province ?? "ไม่ระบุจังหวัด"
                        : `${preview.school.name} · ${preview.class} · รหัส ${preview.studentId}`}
                </p>
            </div>

            <ImpactGrid impact={preview.impact} targetType={preview.type} />
            <div className="grid gap-2 sm:grid-cols-2">
                <Button
                    variant="secondary"
                    disabled={isMarkTestBlocked}
                    onClick={() =>
                        onAction(preview.isTestData ? "unmark-test" : "mark-test")
                    }
                >
                    <Check className="h-4 w-4" />
                    {preview.isTestData
                        ? "ยกเลิกข้อมูลทดสอบ"
                        : "ตั้งเป็นข้อมูลทดสอบ"}
                </Button>
                <Button
                    variant="secondary"
                    disabled={isDisableBlocked}
                    onClick={() => onAction(canRestore ? "restore" : "disable")}
                >
                    <ArchiveRestore className="h-4 w-4" />
                    {canRestore ? "กู้คืน" : "ปิดใช้งาน"}
                </Button>
            </div>
            {isDisableBlocked ? (
                <p className="text-xs leading-5 text-amber-800" role="status">
                    ข้อมูลทดสอบไม่สามารถปิดใช้งานหรือลบถาวรได้
                    กรุณายกเลิกสถานะข้อมูลทดสอบก่อน
                </p>
            ) : isMarkTestBlocked ? (
                <p className="text-xs leading-5 text-amber-800" role="status">
                    ต้องเปิดใช้งานข้อมูลก่อน จึงจะตั้งเป็นข้อมูลทดสอบได้
                </p>
            ) : null}

            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start gap-2 text-red-800">
                    <ShieldAlert className="mt-0.5 h-4 w-4" />
                    <div>
                        <h3 className="text-sm font-bold">พื้นที่ดำเนินการเสี่ยงสูง</h3>
                        <p className="mt-1 text-xs leading-5 text-red-700">
                            ลบถาวรใช้ได้เมื่อข้อมูลถูกปิดใช้งานและไม่ใช่ข้อมูลทดสอบ
                        </p>
                    </div>
                </div>
                <Button
                    className="mt-3"
                    variant="danger"
                    fullWidth
                    disabled={!canDeletePermanently}
                    onClick={() => onAction("permanent-delete")}
                >
                    <Trash2 className="h-4 w-4" />
                    ลบถาวร
                </Button>
                <p className="mt-2 text-xs leading-5 text-red-700" role="status">
                    {getPermanentDeleteEligibilityMessage(preview)}
                </p>
            </div>

            <div>
                <h3 className="text-sm font-bold text-gray-900">
                    ประวัติล่าสุด
                </h3>
                <div className="mt-2 space-y-2">
                    {preview.recentEvents.length === 0 ? (
                        <p className="text-sm text-gray-500">ยังไม่มีประวัติ</p>
                    ) : (
                        preview.recentEvents.map((event) => (
                            <EventRow key={event.id} event={event} compact />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
