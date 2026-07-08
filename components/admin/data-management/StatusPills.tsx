export function StatusPills({
    disabledAt,
    isTestData,
}: {
    disabledAt: Date | null;
    isTestData: boolean;
}) {
    return (
        <span className="flex flex-wrap gap-1">
            <span
                className={`rounded-full px-2 py-1 text-xs font-bold ${
                    disabledAt
                        ? "bg-slate-100 text-slate-700"
                        : "bg-emerald-100 text-emerald-700"
                }`}
            >
                {disabledAt ? "ปิดใช้งาน" : "ใช้งานอยู่"}
            </span>
            {isTestData ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                    ข้อมูลทดสอบ
                </span>
            ) : null}
        </span>
    );
}
