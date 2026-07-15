export type PermanentDeleteTargetType = "school" | "student";

export interface LifecycleTargetState {
    disabledAt: Date | null;
    isTestData: boolean;
}

export function getPermanentDeleteLifecycleMessage(
    targetType: PermanentDeleteTargetType,
    target: LifecycleTargetState,
): string | null {
    if (target.isTestData) {
        return targetType === "student"
            ? "ต้องยกเลิกการตั้งนักเรียนเป็นข้อมูลทดสอบก่อนลบถาวร"
            : "ต้องยกเลิกการตั้งโรงเรียนเป็นข้อมูลทดสอบก่อนลบถาวร";
    }

    if (!target.disabledAt) {
        return targetType === "student"
            ? "ต้องปิดใช้งานนักเรียนก่อนลบถาวร"
            : "ต้องปิดใช้งานโรงเรียนก่อนลบถาวร";
    }

    return null;
}

export function isPermanentDeleteEligible(
    targetType: PermanentDeleteTargetType,
    target: LifecycleTargetState,
): boolean {
    return getPermanentDeleteLifecycleMessage(targetType, target) === null;
}
