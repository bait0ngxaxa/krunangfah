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
        <div className="mb-8 bg-pink-50/50 border border-pink-200 p-6 rounded-2xl backdrop-blur-sm">
            <h3 className="font-bold text-pink-800 mb-4 flex items-center gap-2 text-lg">
                <span className="text-2xl">📝</span>
                บันทึกของครู
            </h3>
            <p className="text-sm text-pink-700/80 mb-4 font-medium">
                บันทึกข้อสังเกต ความคืบหน้า
                หรือข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมนี้
            </p>
            <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="พิมพ์บันทึกของคุณที่นี่..."
                className="w-full p-4 bg-white/80 border border-pink-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-pink-100 focus:border-pink-400 resize-none transition-all placeholder:text-pink-300/70"
                rows={5}
            />
            <button
                onClick={onSave}
                disabled={isSaving || !notes.trim()}
                className="mt-4 px-8 py-3 bg-linear-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-200 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>
                        <span>💾</span>
                        <span>บันทึกโน๊ต</span>
                    </>
                )}
            </button>
        </div>
    );
}
