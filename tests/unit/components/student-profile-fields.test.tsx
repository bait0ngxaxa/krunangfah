import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudentProfileFields } from "@/components/student/profile/StudentProfileEditFields";

describe("StudentProfileFields", () => {
    it("renders the school code and keeps identifiers out of the general form", () => {
        const html = renderToStaticMarkup(
            <StudentProfileFields
                form={{
                    studentId: "1001",
                    firstName: "สมชาย",
                    lastName: "ใจดี",
                    gender: "MALE",
                    age: "13",
                    class: "ม.1/1",
                    status: "ACTIVE",
                }}
                isProfileLocked={false}
                isPending={false}
                updateField={vi.fn()}
            />,
        );

        expect(html).toContain('value="1001"');
        expect(html).not.toContain('id="student-national-id"');
        expect(html).not.toContain("เลขบัตรประชาชน");
    });
});
