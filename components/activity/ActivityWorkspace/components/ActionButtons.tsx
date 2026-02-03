import Link from "next/link";
import { BookOpen, Download } from "lucide-react";

interface ActionButtonsProps {
    studentId: string;
    firstWorksheetUrl: string;
    config: { gradient: string };
    onDownload: (url: string) => void;
}

/**
 * Action buttons for guidelines and download
 */
export function ActionButtons({
    studentId,
    firstWorksheetUrl,
    config,
    onDownload,
}: ActionButtonsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Link
                href={`/students/${studentId}/help/guidelines`}
                className={`flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r ${config.gradient} text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md`}
            >
                <BookOpen className="w-5 h-5" />
                หลักการใช้ใบงาน
            </Link>
            <button
                onClick={() => onDownload(firstWorksheetUrl)}
                className="flex items-center justify-center gap-3 py-4 px-6 bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
            >
                <Download className="w-5 h-5" />
                ดาวน์โหลดใบงาน
            </button>
        </div>
    );
}
