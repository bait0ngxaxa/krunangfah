import type { RiskLevelSummary } from "@/lib/actions/analytics/types";

interface PhqSummaryTableProps {
    riskLevelSummary: RiskLevelSummary[];
}

export function PhqSummaryTable({ riskLevelSummary }: PhqSummaryTableProps) {
    // Order: red, orange, yellow, green, blue
    const orderedLevels = ["red", "orange", "yellow", "green", "blue"];
    const orderedSummary = orderedLevels
        .map((level) =>
            riskLevelSummary.find((item) => item.riskLevel === level),
        )
        .filter((item): item is RiskLevelSummary => item !== undefined);

    return (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-br from-white via-slate-50/60 to-emerald-50/40 p-6 shadow-[0_16px_35px_-22px_rgba(15,23,42,0.45)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-emerald-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-200/25 blur-3xl" />
            <h2 className="relative mb-6 text-center text-xl font-extrabold tracking-tight text-slate-800">
                ผลการคัดกรอง PHQ-A
            </h2>
            <div className="relative overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">
                                จากนักเรียนที่คัด
                                <br />
                                กรองได้ทั้งหมด
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700 w-32">
                                จำนวน (คน)
                            </th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">
                                สั่งต่อโรงพยาบาล
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orderedSummary.map((item) => {
                            return (
                                <tr
                                    key={item.riskLevel}
                                    className="hover:bg-cyan-50/50 transition-colors"
                                    style={{
                                        backgroundColor:
                                            item.count > 0
                                                ? `${item.color}08`
                                                : "transparent",
                                    }}
                                >
                                    <td
                                        className="px-6 py-4 text-sm font-bold flex items-center gap-2"
                                        style={{ color: item.color }}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full shadow-sm"
                                            style={{
                                                backgroundColor: item.color,
                                            }}
                                        />
                                        {item.label}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xl font-bold text-gray-800">
                                        {item.count}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.referralCount > 0 ? (
                                            <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-cyan-100 px-3 text-sm font-bold text-cyan-600 shadow-sm">
                                                {item.referralCount}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 font-medium">
                                                -
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
