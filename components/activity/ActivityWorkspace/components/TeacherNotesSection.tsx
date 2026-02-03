import { Loader2 } from "lucide-react";

interface TeacherNotesSectionProps {
    notes: string;
    onNotesChange: (notes: string) => void;
    onSave: () => void;
    isSaving: boolean;
}

/**
 * Teacher notes section
 */
export function TeacherNotesSection({
    notes,
    onNotesChange,
    onSave,
    isSaving,
}: TeacherNotesSectionProps) {
    return (
        <div className="mb-8 bg-blue-50 border border-blue-200 p-6 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                📝 บันทึกของครู
            </h3>
            <p className="text-sm text-blue-600 mb-3">
                บันทึกข้อสังเกต ความคืบหน้า
                หรือข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมนี้
            </p>
            <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="พิมพ์บันทึกของคุณที่นี่..."
                className="w-full p-4 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 resize-none"
                rows={5}
            />
            <button
                onClick={onSave}
                disabled={isSaving || !notes.trim()}
                className="mt-3 px-6 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>💾 บันทึกโน๊ต</>
                )}
            </button>
        </div>
    );
}
