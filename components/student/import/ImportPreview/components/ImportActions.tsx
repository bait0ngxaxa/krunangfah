interface ImportActionsProps {
    onCancel: () => void;
    onSave: () => void;
    isLoading: boolean;
    canSave: boolean;
    studentCount: number;
}

/**
 * Action buttons for cancel and save
 */
export function ImportActions({
    onCancel,
    onSave,
    isLoading,
    canSave,
    studentCount,
}: ImportActionsProps) {
    return (
        <div className="flex justify-end gap-4 pt-4">
            <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-8 py-3 rounded-2xl text-gray-600 font-bold hover:bg-gray-100 hover:text-gray-800 transition-all disabled:opacity-50 border-2 border-transparent hover:border-gray-200"
            >
                ยกเลิก
            </button>
            <button
                type="button"
                onClick={onSave}
                disabled={!canSave || isLoading}
                className="px-8 py-3 bg-[#0BD0D9] text-white rounded-2xl font-bold shadow-sm hover:shadow-md hover:bg-[#09B8C0] hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>
                        <span>บันทึกข้อมูล</span>
                        <span className="bg-black/10 px-2 py-0.5 rounded-lg text-sm">
                            {studentCount} คน
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
