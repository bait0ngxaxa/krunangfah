import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    revalidatePath: vi.fn(),
    updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: mocks.revalidatePath,
    updateTag: mocks.updateTag,
}));

const { revalidateStudentsCache } = await import("@/lib/actions/student/cache");

describe("student cache invalidation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("expires list, detail, school, and student cache tags immediately", () => {
        revalidateStudentsCache("school-1", "student-1");

        expect(mocks.updateTag).toHaveBeenCalledWith("students");
        expect(mocks.updateTag).toHaveBeenCalledWith("student-detail");
        expect(mocks.updateTag).toHaveBeenCalledWith("students:school:school-1");
        expect(mocks.updateTag).toHaveBeenCalledWith(
            "student-detail:item:student-1",
        );
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/students");
        expect(mocks.revalidatePath).toHaveBeenCalledWith("/students/student-1");
    });
});
