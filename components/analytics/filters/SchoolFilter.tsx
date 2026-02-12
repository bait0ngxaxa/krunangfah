"use client";

import { School } from "lucide-react";

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
                <School className="w-5 h-5" />
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
