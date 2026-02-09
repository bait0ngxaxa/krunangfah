import { describe, it, expect } from "vitest";
import {
    counselingSessionSchema,
    updateCounselingSessionSchema,
    deleteCounselingSessionSchema,
    type CounselingSessionInput,
    type UpdateCounselingSessionInput,
    type DeleteCounselingSessionInput,
} from "@/lib/validations/counseling.validation";

describe("counselingSessionSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid counseling session data", () => {
            const data: CounselingSessionInput = {
                studentId: "clxyz123456789abcdef",
                sessionDate: new Date("2024-05-15"),
                counselorName: "ครูสมชาย ใจดี",
                summary: "นักเรียนมีความกังวลเรื่องการเรียน",
            };
            const result = counselingSessionSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should coerce string date to Date object", () => {
            const data = {
                studentId: "clxyz123456789abcdef",
                sessionDate: "2024-05-15",
                counselorName: "ครูสมชาย",
                summary: "บันทึกการให้คำปรึกษา",
            };
            const result = counselingSessionSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionDate).toBeInstanceOf(Date);
            }
        });
    });

    describe("Invalid studentId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                studentId: "invalid-id",
                sessionDate: new Date(),
                counselorName: "ครูสมชาย",
                summary: "บันทึก",
            };
            const result = counselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Invalid student ID",
                );
            }
        });

        it("should reject empty studentId", () => {
            const data = {
                studentId: "",
                sessionDate: new Date(),
                counselorName: "ครูสมชาย",
                summary: "บันทึก",
            };
            const result = counselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid counselorName", () => {
        it("should reject empty counselorName", () => {
            const data = {
                studentId: "clxyz123456789abcdef",
                sessionDate: new Date(),
                counselorName: "",
                summary: "บันทึก",
            };
            const result = counselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกชื่อผู้ให้คำปรึกษา",
                );
            }
        });
    });

    describe("Invalid summary", () => {
        it("should reject empty summary", () => {
            const data = {
                studentId: "clxyz123456789abcdef",
                sessionDate: new Date(),
                counselorName: "ครูสมชาย",
                summary: "",
            };
            const result = counselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกบันทึกการให้คำปรึกษา",
                );
            }
        });
    });
});

describe("updateCounselingSessionSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid update data", () => {
            const data: UpdateCounselingSessionInput = {
                sessionId: "clxyz123456789abcdef",
                sessionDate: new Date("2024-05-20"),
                counselorName: "ครูสมหญิง",
                summary: "อัพเดทบันทึก",
            };
            const result = updateCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should coerce string date to Date object", () => {
            const data = {
                sessionId: "clxyz123456789abcdef",
                sessionDate: "2024-05-20",
                counselorName: "ครูสมหญิง",
                summary: "อัพเดท",
            };
            const result = updateCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionDate).toBeInstanceOf(Date);
            }
        });
    });

    describe("Invalid sessionId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                sessionId: "invalid-session-id",
                sessionDate: new Date(),
                counselorName: "ครูสมชาย",
                summary: "บันทึก",
            };
            const result = updateCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Invalid session ID",
                );
            }
        });
    });

    describe("Invalid counselorName", () => {
        it("should reject empty counselorName", () => {
            const data = {
                sessionId: "clxyz123456789abcdef",
                sessionDate: new Date(),
                counselorName: "",
                summary: "บันทึก",
            };
            const result = updateCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Invalid summary", () => {
        it("should reject empty summary", () => {
            const data = {
                sessionId: "clxyz123456789abcdef",
                sessionDate: new Date(),
                counselorName: "ครูสมชาย",
                summary: "",
            };
            const result = updateCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });
});

describe("deleteCounselingSessionSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid sessionId", () => {
            const data: DeleteCounselingSessionInput = {
                sessionId: "clxyz123456789abcdef",
            };
            const result = deleteCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid sessionId", () => {
        it("should reject invalid CUID format", () => {
            const data = {
                sessionId: "invalid-id",
            };
            const result = deleteCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "Invalid session ID",
                );
            }
        });

        it("should reject empty sessionId", () => {
            const data = {
                sessionId: "",
            };
            const result = deleteCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it("should reject missing sessionId", () => {
            const data = {} as DeleteCounselingSessionInput;
            const result = deleteCounselingSessionSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });
});
