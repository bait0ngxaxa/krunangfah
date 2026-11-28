/** The only accepted value of the students page `unscreened` URL param. */
export const UNSCREENED_THIS_YEAR_PARAM = "year";

/** Shown while the unscreened filter is on; status changes stay manual. */
export const UNSCREENED_THIS_YEAR_HINT =
    "นักเรียนกลุ่มนี้อาจยังไม่ได้นำเข้าผลของปีนี้ หรืออาจออกจากโรงเรียนแล้ว หากออกแล้วให้เปิดหน้านักเรียนเพื่อเปลี่ยนสถานะ";

export function formatUnscreenedThisYearLabel(
    academicYear: number,
    count: number,
): string {
    return `ไม่มีผลคัดกรองปีการศึกษา ${academicYear}: ${count.toLocaleString("th-TH")} คน`;
}
