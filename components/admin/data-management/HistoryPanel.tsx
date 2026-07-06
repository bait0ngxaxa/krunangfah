import { EventRow } from "./EventRow";
import type { DataManagementEventItem } from "./types";

export function HistoryPanel({ events }: { events: DataManagementEventItem[] }) {
    return (
        <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-base font-bold text-gray-900">
                ประวัติการจัดการข้อมูลล่าสุด
            </h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
                {events.length === 0 ? (
                    <p className="text-sm text-gray-500">เลือกข้อมูลเพื่อโหลดประวัติ</p>
                ) : (
                    events.slice(0, 8).map((event) => (
                        <EventRow key={event.id} event={event} />
                    ))
                )}
            </div>
        </section>
    );
}
