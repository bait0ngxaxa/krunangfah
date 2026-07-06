import type { ManagedPreview } from "./types";

export function ImpactGrid({ impact }: { impact: ManagedPreview["impact"] }) {
    const inviteCount =
        impact.pendingTeacherInviteCount + impact.pendingSchoolAdminInviteCount;
    const items: [string, number][] = [
        ["ผู้ใช้", impact.userCount],
        ["นักเรียน", impact.studentCount],
        ["PHQ", impact.phqResultCount],
        ["กิจกรรม", impact.activityProgressCount],
        ["ปรึกษา", impact.counselingSessionCount],
        ["เยี่ยมบ้าน", impact.homeVisitCount],
        ["ไฟล์", impact.fileCount],
        ["คำเชิญค้าง", inviteCount],
    ];

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
