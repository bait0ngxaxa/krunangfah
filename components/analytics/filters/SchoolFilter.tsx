"use client";

interface SchoolOption {
    id: string;
    name: string;
}

interface SchoolFilterProps {
    schools: SchoolOption[];
    selectedSchoolId: string;
    onSchoolChange: (schoolId: string) => void;
}

export function SchoolFilter({
    schools,
    selectedSchoolId,
    onSchoolChange,
}: SchoolFilterProps) {
    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-4 flex items-center gap-4">
            <div className="p-2 bg-pink-50 rounded-lg text-pink-500">
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                </svg>
            </div>
            <div className="flex-1 flex items-center gap-3">
                <label
                    htmlFor="school-filter"
                    className="text-sm font-bold text-gray-700 whitespace-nowrap"
                >
                    เลือกโรงเรียน:
                </label>
                <select
                    id="school-filter"
                    value={selectedSchoolId}
                    onChange={(e) => onSchoolChange(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none bg-white hover:border-pink-300 text-gray-600 font-medium cursor-pointer"
                >
                    <option value="all">ทุกโรงเรียน</option>
                    {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                            {school.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
