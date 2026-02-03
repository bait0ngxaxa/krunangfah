"use client";

interface ClassFilterProps {
    availableClasses: string[];
    currentClass?: string;
    onClassChange: (classValue: string) => void;
}

export function ClassFilter({
    availableClasses,
    currentClass,
    onClassChange,
}: ClassFilterProps) {
    if (availableClasses.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4">
            <div className="flex items-center gap-4">
                <label
                    htmlFor="class-filter"
                    className="text-sm font-semibold text-gray-700 whitespace-nowrap"
                >
                    🔍 เลือกห้อง:
                </label>
                <select
                    id="class-filter"
                    value={currentClass || "all"}
                    onChange={(e) => onClassChange(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all outline-none"
                >
                    <option value="all">ทุกห้อง</option>
                    {availableClasses.map((className) => (
                        <option key={className} value={className}>
                            {className}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
