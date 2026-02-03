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
        <div className="flex justify-end gap-4">
            <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
                ยกเลิก
            </button>
            <button
                type="button"
                onClick={onSave}
                disabled={!canSave || isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        กำลังบันทึก...
                    </>
                ) : (
                    <>บันทึกข้อมูล ({studentCount} คน)</>
                )}
            </button>
        </div>
    );
}
