import { describe, it, expect } from "vitest";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";
import {
    submitAssessmentSchema,
    scheduleActivitySchema,
    updateTeacherNotesSchema,
    updateScheduledDateSchema,
    PROBLEM_TYPES,
    type SubmitAssessmentInput,
    type ScheduleActivityInput,
    type UpdateTeacherNotesInput,
} from "@/lib/validations/activity.validation";

describe("submitAssessmentSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid assessment data with internal problem type", () => {
            const data: SubmitAssessmentInput = {
                activityProgressId: "clxyz123456789abcdef",
                internalProblems: "ปัญหาภายใน: ความเครียด",
                externalProblems: "ปัญหาภายนอก: ครอบครัว",
                problemType: "internal",
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept valid assessment data with external problem type", () => {
            const data: SubmitAssessmentInput = {
                activityProgressId: "clxyz123456789abcdef",
                internalProblems: "ความกังวล",
                externalProblems: "ปัญหาเพื่อน",
                problemType: "external",
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid activityProgressId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                activityProgressId: "invalid-id",
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal" as const,
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Invalid activity progress ID",
                );
            }
        });
    });

    describe("Invalid internalProblems", () => {
        it("should reject empty internalProblems", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                internalProblems: "",
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal" as const,
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกปัญหาภายใน",
                );
            }
        });

        it("should reject internalProblems longer than configured limit", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                internalProblems: "ก".repeat(
                    INPUT_LIMITS.activity.internalProblems + 1,
                ),
                externalProblems: "ปัญหาภายนอก",
                problemType: "internal" as const,
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid externalProblems", () => {
        it("should reject empty externalProblems", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                internalProblems: "ปัญหาภายใน",
                externalProblems: "",
                problemType: "external" as const,
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกปัญหาภายนอก",
                );
            }
        });
    });

    describe("Invalid problemType", () => {
        it("should reject invalid problemType", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                internalProblems: "ปัญหาภายใน",
                externalProblems: "ปัญหาภายนอก",
                problemType: "invalid" as SubmitAssessmentInput["problemType"],
            };
            const result = submitAssessmentSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should only accept internal or external", () => {
            PROBLEM_TYPES.forEach((type) => {
                const data = {
                    activityProgressId: "clxyz123456789abcdef",
                    internalProblems: "ปัญหาภายใน",
                    externalProblems: "ปัญหาภายนอก",
                    problemType: type,
                };
                const result = submitAssessmentSchema.safeParse(data);
                expect(result.success).toBe(true);
            });
        });
    });
});

describe("scheduleActivitySchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid schedule data without teacherNotes", () => {
            const data: ScheduleActivityInput = {
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: new Date("2024-06-01"),
                teacherId: "clteacher123456789abc",
            };
            const result = scheduleActivitySchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept valid schedule data with teacherNotes", () => {
            const data: ScheduleActivityInput = {
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: new Date("2024-06-01"),
                teacherId: "clteacher123456789abc",
                teacherNotes: "บันทึกเพิ่มเติม",
            };
            const result = scheduleActivitySchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept empty teacherNotes (optional)", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: new Date("2024-06-01"),
                teacherId: "clteacher123456789abc",
                teacherNotes: "",
            };
            const result = scheduleActivitySchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid activityProgressId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                activityProgressId: "invalid",
                scheduledDate: new Date(),
                teacherId: "clteacher123456789abc",
            };
            const result = scheduleActivitySchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid teacherId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: new Date(),
                teacherId: "invalid-teacher-id",
            };
            const result = scheduleActivitySchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Invalid teacher ID",
                );
            }
        });
    });
});

describe("updateTeacherNotesSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid teacher notes data", () => {
            const data: UpdateTeacherNotesInput = {
                activityProgressId: "clxyz123456789abcdef",
                notes: "บันทึกของครู",
            };
            const result = updateTeacherNotesSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid activityProgressId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                activityProgressId: "invalid-id",
                notes: "บันทึก",
            };
            const result = updateTeacherNotesSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid notes", () => {
        it("should reject empty notes", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                notes: "",
            };
            const result = updateTeacherNotesSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("กรุณากรอกบันทึก");
            }
        });

        it("should reject notes longer than configured limit", () => {
            const data = {
                activityProgressId: "clxyz123456789abcdef",
                notes: "ก".repeat(INPUT_LIMITS.activity.teacherNotes + 1),
            };
            const result = updateTeacherNotesSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });
});

describe("updateScheduledDateSchema", () => {
    describe("Valid inputs", () => {
        it("should accept a valid ISO date string", () => {
            const result = updateScheduledDateSchema.safeParse({
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: "2024-06-01",
            });
            expect(result.success).toBe(true);
        });

        it("should accept a valid datetime string", () => {
            const result = updateScheduledDateSchema.safeParse({
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: "2024-06-01T10:00:00.000Z",
            });
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid scheduledDate", () => {
        it("should reject an invalid date string", () => {
            const result = updateScheduledDateSchema.safeParse({
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: "not-a-date",
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("วันที่ไม่ถูกต้อง");
            }
        });

        it("should reject empty string date", () => {
            const result = updateScheduledDateSchema.safeParse({
                activityProgressId: "clxyz123456789abcdef",
                scheduledDate: "",
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("วันที่ไม่ถูกต้อง");
            }
        });
    });

    describe("Invalid activityProgressId", () => {
        it("should reject invalid CUID format", () => {
            const result = updateScheduledDateSchema.safeParse({
                activityProgressId: "invalid-id",
                scheduledDate: "2024-06-01",
            });
            expect(result.success).toBe(false);
        });
    });
});
