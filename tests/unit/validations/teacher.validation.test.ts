import { describe, it, expect } from "vitest";
import {
    teacherProfileSchema,
    projectRoles,
    type TeacherProfileFormData,
} from "@/lib/validations/teacher.validation";

describe("teacherProfileSchema", () => {
    describe("Valid inputs", () => {
        it("should accept valid teacher profile data", () => {
            const data: TeacherProfileFormData = {
                firstName: "สมชาย",
                lastName: "ใจดี",
                age: 35,
                advisoryClass: "ม.2/5",
                academicYearId: "clxyz123456789",
                schoolRole: "ครูประจำชั้น",
                projectRole: "lead",
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(data);
            }
        });

        it("should accept all valid project roles", () => {
            projectRoles.forEach((role) => {
                const data = {
                    firstName: "Test",
                    lastName: "User",
                    age: 30,
                    advisoryClass: "ม.1/1",
                    academicYearId: "test123",
                    schoolRole: "Teacher",
                    projectRole: role,
                };
                const result = teacherProfileSchema.safeParse(data);
                expect(result.success).toBe(true);
            });
        });

        it("should accept minimum age of 18", () => {
            const data = {
                firstName: "Young",
                lastName: "Teacher",
                age: 18,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "care" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it("should accept maximum age of 100", () => {
            const data = {
                firstName: "Old",
                lastName: "Teacher",
                age: 100,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "coordinate" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });

    describe("Invalid firstName", () => {
        it("should reject empty firstName", () => {
            const data = {
                firstName: "",
                lastName: "ใจดี",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("กรุณากรอกชื่อ");
            }
        });
    });

    describe("Invalid lastName", () => {
        it("should reject empty lastName", () => {
            const data = {
                firstName: "สมชาย",
                lastName: "",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("กรุณากรอกนามสกุล");
            }
        });
    });

    describe("Invalid age", () => {
        it("should reject age less than 18", () => {
            const data = {
                firstName: "Young",
                lastName: "Person",
                age: 17,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "อายุต้องมากกว่า 18 ปี",
                );
            }
        });

        it("should reject age greater than 100", () => {
            const data = {
                firstName: "Very",
                lastName: "Old",
                age: 101,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe("อายุไม่ถูกต้อง");
            }
        });
    });

    describe("Invalid advisoryClass", () => {
        it("should reject empty advisoryClass", () => {
            const data = {
                firstName: "Test",
                lastName: "User",
                age: 30,
                advisoryClass: "",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกชั้นที่ปรึกษา",
                );
            }
        });
    });

    describe("Invalid academicYearId", () => {
        it("should reject empty academicYearId", () => {
            const data = {
                firstName: "Test",
                lastName: "User",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId: "",
                schoolRole: "Teacher",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณาเลือกปีการศึกษา",
                );
            }
        });
    });

    describe("Invalid schoolRole", () => {
        it("should reject empty schoolRole", () => {
            const data = {
                firstName: "Test",
                lastName: "User",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "",
                projectRole: "lead" as const,
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณากรอกบทบาทหน้าที่ในโรงเรียน",
                );
            }
        });
    });

    describe("Invalid projectRole", () => {
        it("should reject invalid projectRole", () => {
            const data = {
                firstName: "Test",
                lastName: "User",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "invalid" as TeacherProfileFormData["projectRole"],
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe(
                    "กรุณาเลือกบทบาทในโครงการ",
                );
            }
        });

        it("should reject empty projectRole", () => {
            const data = {
                firstName: "Test",
                lastName: "User",
                age: 30,
                advisoryClass: "ม.1/1",
                academicYearId: "test123",
                schoolRole: "Teacher",
                projectRole: "" as TeacherProfileFormData["projectRole"],
            };
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe("Missing fields", () => {
        it("should reject when all fields are missing", () => {
            const data = {} as TeacherProfileFormData;
            const result = teacherProfileSchema.safeParse(data);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.length).toBeGreaterThan(0);
            }
        });
    });
});
