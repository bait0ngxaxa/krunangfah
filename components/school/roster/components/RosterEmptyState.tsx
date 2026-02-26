import { Users } from "lucide-react";

export function RosterEmptyState() {
    return (
        <div className="text-center py-8">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
                ยังไม่มีรายชื่อครู — เพิ่มด้านบนได้เลย
            </p>
            <p className="text-xs text-gray-300 mt-1">
                ข้ามได้ — เพิ่มทีหลังจากหน้าจัดการ
            </p>
        </div>
    );
}
