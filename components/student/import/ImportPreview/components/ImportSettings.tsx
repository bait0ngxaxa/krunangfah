import type { AcademicYear } from "../types";

interface ImportSettingsProps {
    academicYears: AcademicYear[];
    selectedYearId: string;
    onYearChange: (yearId: string) => void;
    assessmentRound: number;
    onRoundChange: (round: number) => void;
}

/**
 * Settings for academic year and assessment round selection
 */
export function ImportSettings({
    academicYears,
    selectedYearId,
    onYearChange,
    assessmentRound,
    onRoundChange,
}: ImportSettingsProps) {
    return (
        <div className="space-y-4">
            {/* Academic Year Selector */}
            <div className="flex items-center gap-4">
                <label className="text-gray-700 font-medium min-w-[120px]">
                    ปีการศึกษา:
                </label>
                <select
                    value={selectedYearId}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value="">เลือกปีการศึกษา</option>
                    {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>
                            {year.year} เทอม {year.semester}
                        </option>
                    ))}
                </select>
            </div>

            {/* Assessment Round Selector */}
            <div className="flex items-center gap-4">
                <label className="text-gray-700 font-medium min-w-[120px]">
                    รอบการประเมิน:
                </label>
                <select
                    value={assessmentRound}
                    onChange={(e) => onRoundChange(Number(e.target.value))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value={1}>ครั้งที่ 1</option>
                    <option value={2}>ครั้งที่ 2</option>
                </select>
            </div>
        </div>
    );
}
