import type { ManagedPreview } from "./types";

type ImpactTargetType = ManagedPreview["type"];

export function ImpactGrid({
    impact,
    targetType = "school",
}: {
    impact: ManagedPreview["impact"];
    targetType?: ImpactTargetType;
}) {
    const inviteCount =
        impact.pendingTeacherInviteCount + impact.pendingSchoolAdminInviteCount;
    const schoolItems: [string, number][] = [
        ["บัญชีบุคลากร", impact.userCount],
        ["นักเรียนทั้งหมด", impact.studentCount],
        ["ผลคัดกรอง", impact.phqResultCount],
        ["กิจกรรมดูแล", impact.activityProgressCount],
        ["บันทึกปรึกษา", impact.counselingSessionCount],
        ["บันทึกเยี่ยมบ้าน", impact.homeVisitCount],
        ["ไฟล์แนบ", impact.fileCount],
        ["คำเชิญที่ยังไม่ตอบรับ", inviteCount],
    ];
    const studentItems: [string, number][] = [
        ["ผลคัดกรองของนักเรียน", impact.phqResultCount],
        ["กิจกรรมดูแล", impact.activityProgressCount],
        ["บันทึกปรึกษา", impact.counselingSessionCount],
        ["บันทึกเยี่ยมบ้าน", impact.homeVisitCount],
        ["ไฟล์แนบ", impact.fileCount],
    ];
    const items = targetType === "student" ? studentItems : schoolItems;

    return (
        <div className="grid grid-cols-2 gap-2">
            {items.map(([label, value]) => (
                <div
                    key={label}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                    <p className="text-xs text-gray-600">{label}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                        {value}
                    </p>
                </div>
            ))}
        </div>
    );
}
