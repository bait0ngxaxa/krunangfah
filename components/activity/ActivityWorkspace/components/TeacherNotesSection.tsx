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
        <div className="flex h-full flex-col rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
                <FileText className="w-6 h-6 text-gray-600" />
                บันทึกของครู
            </h3>

            {isEditing ? (
                /* ── Edit Mode ── */
                <>
                    <p className="mb-3 text-sm font-medium text-gray-500">
                        บันทึกข้อสังเกต ความคืบหน้า
                        หรือข้อมูลเพิ่มเติมเกี่ยวกับกิจกรรมนี้
                    </p>
                    <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder="พิมพ์บันทึกของคุณที่นี่..."
                        className="w-full flex-1 resize-none rounded-xl border border-gray-200 bg-white p-4 transition-all placeholder:text-gray-300 focus:border-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                        rows={5}
                        autoFocus
                    />
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !notes.trim()}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-cyan-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="flex-1 rounded-xl border border-gray-200 bg-white p-5">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {savedNotes}
                        </p>
                    </div>
                    <button
                        onClick={handleEdit}
                        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50"
                    >
                        <Pencil className="w-5 h-5" />
                        แก้ไขบันทึก
                    </button>
                </>
            )}
        </div>
    );
}
