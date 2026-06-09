import type { AcademicYear } from "../types";

interface ImportSettingsProps {
    academicYears: AcademicYear[];
    selectedYearId: string;
    onYearChange: (yearId: string) => void;
    assessmentRound: number;
    onRoundChange: (round: number) => void;
    hasRound1: boolean;
    isLoading: boolean;
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
    isLoading,
}: ImportSettingsProps) {
    const hasAcademicYears = academicYears.length > 0;

    return (
        <div className="space-y-4">
            <div className="grid gap-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 md:grid-cols-2 md:p-5">
                <div className="space-y-2">
                    <label className="ml-1 block text-sm font-bold text-gray-700">
                        ปีการศึกษา
                    </label>
                    <div className="relative">
                        <select
                            value={selectedYearId}
                            onChange={(e) => onYearChange(e.target.value)}
                            disabled={isLoading || !hasAcademicYears}
                            className="w-full appearance-none rounded-xl border border-emerald-100 bg-white px-4 py-3 font-medium text-gray-700 outline-none transition-base focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                        >
                            <option value="">
                                {isLoading
                                    ? "กำลังโหลดปีการศึกษา…"
                                    : "เลือกปีการศึกษา"}
                            </option>
                            {academicYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.year} เทอม {year.semester}
                                    {year.isCurrent ? " (ปัจจุบัน)" : ""}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                            ▼
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="ml-1 block text-sm font-bold text-gray-700">
                        รอบการประเมิน
                    </label>
                    <div className="relative">
                        <select
                            value={assessmentRound}
                            onChange={(e) =>
                                onRoundChange(Number(e.target.value))
                            }
                            disabled={isLoading || !selectedYearId}
                            className="w-full appearance-none rounded-xl border border-emerald-100 bg-white px-4 py-3 font-medium text-gray-700 outline-none transition-base focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                        >
                            <option value={1}>ครั้งที่ 1</option>
                            <option value={2} disabled={!hasRound1}>
                                ครั้งที่ 2
                                {!hasRound1
                                    ? " (ต้องนำเข้าครั้งที่ 1 ก่อน)"
                                    : ""}
                            </option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500">
                            ▼
                        </div>
                    </div>
                </div>
            </div>

            {!isLoading && !hasAcademicYears && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                    ยังไม่มีปีการศึกษาในระบบ กรุณาสร้างปีการศึกษาก่อนนำเข้า
                </p>
            )}

            {selectedYearId && !hasRound1 && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                    ปีการศึกษานี้ยังไม่มีข้อมูลครั้งที่ 1
                    กรุณานำเข้าครั้งที่ 1 ก่อน จึงจะสามารถเลือกครั้งที่ 2 ได้
                </p>
            )}
        </div>
    );
}
