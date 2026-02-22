import { Loader2, FileText, Save } from "lucide-react";

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
        <div className="h-full flex flex-col bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 text-lg">
                <FileText className="w-6 h-6 text-emerald-700" />
                บันทึกของครู
            </h3>
            <p className="text-sm text-emerald-700/80 mb-4 font-medium">
                บันทึกข้อสังเกต ความคืบหน้า
                หรือข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมนี้
            </p>
            <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="พิมพ์บันทึกของคุณที่นี่..."
                className="w-full p-4 bg-white border-2 border-emerald-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 resize-none transition-all placeholder:text-emerald-300/70 flex-1"
                rows={5}
            />
            <button
                onClick={onSave}
                disabled={isSaving || !notes.trim()}
                className="mt-4 px-8 py-3 bg-[#0BD0D9] text-white rounded-xl font-bold hover:shadow-md hover:bg-[#09B8C0] hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                {isSaving ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5" />
                        <span>บันทึกโน๊ต</span>
                    </>
                )}
            </button>
        </div>
    );
}
