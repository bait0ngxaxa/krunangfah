import type { AcademicYear } from "../types";

interface ImportSettingsProps {
    academicYears: AcademicYear[];
    selectedYearId: string;
    onYearChange: (yearId: string) => void;
    assessmentRound: number;
    onRoundChange: (round: number) => void;
    hasRound1: boolean;
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
    hasRound1,
}: ImportSettingsProps) {
    return (
        <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6 bg-white/40 p-6 rounded-2xl border border-white/50 shadow-inner">
                {/* Academic Year Selector */}
                <div className="space-y-2">
                    <label className="text-gray-700 font-bold block ml-1 text-sm">
                        ปีการศึกษา
                    </label>
                    <div className="relative">
                        <select
                            value={selectedYearId}
                            onChange={(e) => onYearChange(e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 outline-none transition-all shadow-sm appearance-none text-gray-700 font-medium"
                        >
                            <option value="">เลือกปีการศึกษา</option>
                            {academicYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.year} เทอม {year.semester}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                            ▼
                        </div>
                    </div>
                </div>

                {/* Assessment Round Selector */}
                <div className="space-y-2">
                    <label className="text-gray-700 font-bold block ml-1 text-sm">
                        รอบการประเมิน
                    </label>
                    <div className="relative">
                        <select
                            value={assessmentRound}
                            onChange={(e) =>
                                onRoundChange(Number(e.target.value))
                            }
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-300 outline-none transition-all shadow-sm appearance-none text-gray-700 font-medium"
                        >
                            <option value={1}>ครั้งที่ 1</option>
                            <option value={2} disabled={!hasRound1}>
                                ครั้งที่ 2
                                {!hasRound1
                                    ? " (ต้องนำเข้าครั้งที่ 1 ก่อน)"
                                    : ""}
                            </option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-400">
                            ▼
                        </div>
                    </div>
                </div>
            </div>

            {/* Warning: round 2 blocked */}
            {selectedYearId && !hasRound1 && assessmentRound === 1 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    💡 ปีการศึกษานี้ยังไม่มีข้อมูลครั้งที่ 1 —
                    กรุณานำเข้าครั้งที่ 1 ก่อน จึงจะสามารถเลือกครั้งที่ 2 ได้
                </p>
            )}
        </div>
    );
}
