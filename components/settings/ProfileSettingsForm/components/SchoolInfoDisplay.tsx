interface SchoolInfoDisplayProps {
    schoolName: string;
}

/**
 * Read-only display of school information
 * School cannot be edited to prevent data integrity issues
 */
export function SchoolInfoDisplay({ schoolName }: SchoolInfoDisplayProps) {
    return (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
                โรงเรียน
            </label>
            <p className="text-gray-800 font-medium">{schoolName}</p>
            <p className="text-xs text-gray-500 mt-1">
                ไม่สามารถเปลี่ยนโรงเรียนได้
            </p>
        </div>
    );
}
