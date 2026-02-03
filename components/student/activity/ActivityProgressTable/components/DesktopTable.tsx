// components/student/activity/ActivityProgressTable/components/DesktopTable.tsx

import type { DesktopTableProps } from "../types";
import { ActivityRow } from "./ActivityRow";

/**
 * Desktop table view wrapper
 */
export function DesktopTable({ progressData }: DesktopTableProps) {
    return (
        <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-linear-to-r from-indigo-600 to-purple-600 text-white">
                        <th className="px-4 py-3 text-left rounded-tl-xl">
                            กิจกรรมที่ต้องทำ
                        </th>
                        <th className="px-4 py-3 text-left">วันที่นัดหมาย</th>
                        <th className="px-4 py-3 text-left">ครูผู้ทำกิจกรรม</th>
                        <th className="px-4 py-3 text-center rounded-tr-xl">
                            สถานะ
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {progressData.map((progress, index) => (
                        <ActivityRow
                            key={progress.id}
                            progress={progress}
                            index={index}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
