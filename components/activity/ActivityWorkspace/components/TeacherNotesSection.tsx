"use client";

import { useState } from "react";
import { Loader2, FileText, Save, Pencil, X } from "lucide-react";

interface TeacherNotesSectionProps {
    notes: string;
    onNotesChange: (notes: string) => void;
    onSave: () => void;
    isSaving: boolean;
    savedNotes?: string | null;
}

/**
 * Teacher notes section — view/edit toggle
 * View mode: shows saved notes read-only + edit button
 * Edit mode: textarea + save/cancel buttons
 */
export function TeacherNotesSection({
    notes,
    onNotesChange,
    onSave,
    isSaving,
    savedNotes,
}: TeacherNotesSectionProps) {
    const [isEditing, setIsEditing] = useState(!savedNotes);
    const [prevSavedNotes, setPrevSavedNotes] = useState(savedNotes);

    // Switch to view mode when savedNotes update (after save + refresh)
    if (savedNotes !== prevSavedNotes) {
        setPrevSavedNotes(savedNotes);
        if (savedNotes) {
            setIsEditing(false);
        }
    }

    const handleEdit = () => {
        onNotesChange(savedNotes || "");
        setIsEditing(true);
    };

    const handleCancel = () => {
        onNotesChange(savedNotes || "");
        setIsEditing(false);
    };

    const handleSave = () => {
        onSave();
    };

    return (
        <div className="h-full flex flex-col bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 text-lg">
                <FileText className="w-6 h-6 text-emerald-700" />
                บันทึกของครู
            </h3>

            {isEditing ? (
                /* ── Edit Mode ── */
                <>
                    <p className="text-sm text-emerald-700/80 mb-3 font-medium">
                        บันทึกข้อสังเกต ความคืบหน้า
                        หรือข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมนี้
                    </p>
                    <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder="พิมพ์บันทึกของคุณที่นี่..."
                        className="w-full p-4 bg-white border-2 border-emerald-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 resize-none transition-all placeholder:text-emerald-300/70 flex-1"
                        rows={5}
                        autoFocus
                    />
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !notes.trim()}
                            className="flex-1 px-6 py-3 bg-[#0BD0D9] text-white rounded-xl font-bold hover:shadow-md hover:bg-[#09B8C0] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>บันทึก</span>
                                </>
                            )}
                        </button>
                        {savedNotes && (
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-5 py-3 bg-white text-gray-500 border-2 border-gray-200 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                                ยกเลิก
                            </button>
                        )}
                    </div>
                </>
            ) : (
                /* ── View Mode ── */
                <>
                    <div className="bg-white border-2 border-emerald-200/60 rounded-xl p-5 flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {savedNotes}
                        </p>
                    </div>
                    <button
                        onClick={handleEdit}
                        className="mt-4 px-6 py-3 bg-white text-emerald-700 border-2 border-emerald-200 rounded-xl font-bold hover:bg-emerald-100/50 hover:border-emerald-300 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Pencil className="w-5 h-5" />
                        แก้ไขบันทึก
                    </button>
                </>
            )}
        </div>
    );
}
