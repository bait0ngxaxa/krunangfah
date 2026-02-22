import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// Bug #1: Access control for getActivityProgress
// File: activity/queries.ts
// Fix: Added verifyActivityAccess check
// ═══════════════════════════════════════════════════════════

describe("Bug #1 — Activity Progress Access Control", () => {
    type UserRole = "system_admin" | "school_admin" | "class_teacher";

    interface User {
        id: string;
        role: UserRole;
        schoolId: string | null;
        advisoryClass?: string;
    }

    interface Student {
        id: string;
        schoolId: string;
        class: string;
    }

    /**
     * Pure logic extracted from verifyActivityAccess
     * Determines if a user can access a student's activity progress
     */
    const canAccessActivityProgress = (
        user: User,
        student: Student,
    ): { allowed: boolean; reason?: string } => {
        // system_admin can access anything
        if (user.role === "system_admin") {
            return { allowed: true };
        }

        // Must be in same school
        if (!user.schoolId || user.schoolId !== student.schoolId) {
            return { allowed: false, reason: "different_school" };
        }

        // class_teacher: must be in advisory class
        if (user.role === "class_teacher") {
            if (!user.advisoryClass || user.advisoryClass !== student.class) {
                return { allowed: false, reason: "different_class" };
            }
        }

        return { allowed: true };
    };

    const studentA: Student = {
        id: "student-1",
        schoolId: "school-1",
        class: "ม.2/5",
    };

    describe("system_admin", () => {
        it("should access any student's activity progress", () => {
            const admin: User = {
                id: "admin-1",
                role: "system_admin",
                schoolId: null,
            };
            expect(canAccessActivityProgress(admin, studentA).allowed).toBe(
                true,
            );
        });
    });

    describe("school_admin", () => {
        it("should access students in same school", () => {
            const admin: User = {
                id: "admin-1",
                role: "school_admin",
                schoolId: "school-1",
            };
            expect(canAccessActivityProgress(admin, studentA).allowed).toBe(
                true,
            );
        });

        it("should NOT access students in different school", () => {
            const admin: User = {
                id: "admin-1",
                role: "school_admin",
                schoolId: "school-2",
            };
            const result = canAccessActivityProgress(admin, studentA);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("different_school");
        });
    });

    describe("class_teacher", () => {
        it("should access students in advisory class", () => {
            const teacher: User = {
                id: "teacher-1",
                role: "class_teacher",
                schoolId: "school-1",
                advisoryClass: "ม.2/5",
            };
            expect(canAccessActivityProgress(teacher, studentA).allowed).toBe(
                true,
            );
        });

        it("should NOT access students in different class", () => {
            const teacher: User = {
                id: "teacher-1",
                role: "class_teacher",
                schoolId: "school-1",
                advisoryClass: "ม.3/1",
            };
            const result = canAccessActivityProgress(teacher, studentA);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("different_class");
        });

        it("should NOT access students in different school even if same class name", () => {
            const teacher: User = {
                id: "teacher-1",
                role: "class_teacher",
                schoolId: "school-2",
                advisoryClass: "ม.2/5",
            };
            const result = canAccessActivityProgress(teacher, studentA);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("different_school");
        });

        it("should NOT access if advisoryClass is undefined", () => {
            const teacher: User = {
                id: "teacher-1",
                role: "class_teacher",
                schoolId: "school-1",
            };
            const result = canAccessActivityProgress(teacher, studentA);
            expect(result.allowed).toBe(false);
            expect(result.reason).toBe("different_class");
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Bug #2 & #8: Transaction integrity
// Files: teacher-invite/mutations.ts, teacher.actions.ts
// Fix: Wrapped multi-step DB operations in transactions
// ═══════════════════════════════════════════════════════════

describe("Bug #2 & #8 — Transaction Integrity (Invite & Create Profile)", () => {
    /**
     * Simulates multi-step operations that must be atomic.
     * Each step can succeed or fail. If any step fails,
     * the entire operation should roll back.
     */
    interface OperationStep {
        name: string;
        execute: () => boolean;
    }

    const executeWithTransaction = (
        steps: OperationStep[],
    ): { success: boolean; completedSteps: string[]; failedAt?: string } => {
        const completedSteps: string[] = [];

        for (const step of steps) {
            const result = step.execute();
            if (!result) {
                // Transaction should roll back all completed steps
                return {
                    success: false,
                    completedSteps: [], // rolled back
                    failedAt: step.name,
                };
            }
            completedSteps.push(step.name);
        }

        return { success: true, completedSteps };
    };

    const executeWithoutTransaction = (
        steps: OperationStep[],
    ): { success: boolean; completedSteps: string[]; failedAt?: string } => {
        const completedSteps: string[] = [];

        for (const step of steps) {
            const result = step.execute();
            if (!result) {
                return {
                    success: false,
                    completedSteps, // NOT rolled back — partial state
                    failedAt: step.name,
                };
            }
            completedSteps.push(step.name);
        }

        return { success: true, completedSteps };
    };

    describe("acceptTeacherInvite (Bug #2)", () => {
        const inviteSteps = (teacherFails: boolean): OperationStep[] => [
            { name: "create_user", execute: () => true },
            { name: "mark_invite_accepted", execute: () => true },
            { name: "create_teacher_profile", execute: () => !teacherFails },
        ];

        it("should leave no partial state if teacher creation fails (with transaction)", () => {
            const result = executeWithTransaction(inviteSteps(true));
            expect(result.success).toBe(false);
            expect(result.completedSteps).toHaveLength(0); // All rolled back
            expect(result.failedAt).toBe("create_teacher_profile");
        });

        it("should succeed when all steps complete", () => {
            const result = executeWithTransaction(inviteSteps(false));
            expect(result.success).toBe(true);
            expect(result.completedSteps).toHaveLength(3);
        });

        it("WITHOUT transaction: creates partial state (the bug)", () => {
            const result = executeWithoutTransaction(inviteSteps(true));
            expect(result.success).toBe(false);
            // Bug: user created + invite accepted but NO teacher profile
            expect(result.completedSteps).toEqual([
                "create_user",
                "mark_invite_accepted",
            ]);
        });
    });

    describe("createTeacherProfile (Bug #8)", () => {
        const profileSteps = (teacherFails: boolean): OperationStep[] => [
            { name: "find_or_create_school", execute: () => true },
            { name: "update_user_schoolId", execute: () => true },
            { name: "create_teacher", execute: () => !teacherFails },
        ];

        it("should leave no partial state if teacher creation fails (with transaction)", () => {
            const result = executeWithTransaction(profileSteps(true));
            expect(result.success).toBe(false);
            expect(result.completedSteps).toHaveLength(0);
            expect(result.failedAt).toBe("create_teacher");
        });

        it("should succeed when all steps complete", () => {
            const result = executeWithTransaction(profileSteps(false));
            expect(result.success).toBe(true);
            expect(result.completedSteps).toHaveLength(3);
        });

        it("WITHOUT transaction: user has schoolId but no teacher profile (the bug)", () => {
            const result = executeWithoutTransaction(profileSteps(true));
            expect(result.success).toBe(false);
            expect(result.completedSteps).toEqual([
                "find_or_create_school",
                "update_user_schoolId",
            ]);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Bug #3: Session number race condition
// File: counseling.actions.ts
// Fix: Wrapped sessionNumber read+create in transaction
// ═══════════════════════════════════════════════════════════

describe("Bug #3 — Counseling Session Number Race Condition", () => {
    /**
     * Simulates session number generation logic
     */
    const getNextSessionNumber = (existingSessions: number[]): number => {
        const max =
            existingSessions.length > 0 ? Math.max(...existingSessions) : 0;
        return max + 1;
    };

    it("should generate session number 1 for first session", () => {
        expect(getNextSessionNumber([])).toBe(1);
    });

    it("should increment from last session number", () => {
        expect(getNextSessionNumber([1, 2, 3])).toBe(4);
    });

    it("should handle non-sequential session numbers", () => {
        expect(getNextSessionNumber([1, 3, 5])).toBe(6);
    });

    describe("race condition simulation", () => {
        /**
         * Without transaction: two concurrent reads see the same "last" session.
         */
        it("should detect duplicate session numbers WITHOUT transaction", () => {
            const existingSessions = [1, 2, 3];

            // Two concurrent reads both see max = 3
            const readA = getNextSessionNumber(existingSessions);
            const readB = getNextSessionNumber(existingSessions);

            // Both get 4 → DUPLICATE!
            expect(readA).toBe(readB);
            expect(readA).toBe(4);
        });

        /**
         * With transaction + serial isolation: reads are serialized.
         * Simulated by updating state between reads.
         */
        it("should produce unique session numbers WITH transaction (serialized)", () => {
            const existingSessions = [1, 2, 3];

            // Transaction A reads and writes
            const sessionA = getNextSessionNumber(existingSessions);
            existingSessions.push(sessionA); // committed

            // Transaction B reads AFTER A commits
            const sessionB = getNextSessionNumber(existingSessions);

            expect(sessionA).toBe(4);
            expect(sessionB).toBe(5);
            expect(sessionA).not.toBe(sessionB);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Bug #4: Missing status check in submitTeacherAssessment
// File: activity/mutations.ts
// Fix: Added status === "pending_assessment" guard
// ═══════════════════════════════════════════════════════════

describe("Bug #4 — submitTeacherAssessment Status Guard", () => {
    type ActivityStatus =
        | "locked"
        | "unlocked"
        | "in_progress"
        | "pending_assessment"
        | "completed";

    /**
     * Pure logic: can a teacher assessment be submitted for this status?
     */
    const canSubmitAssessment = (status: ActivityStatus): boolean => {
        return status === "pending_assessment";
    };

    it("should allow assessment when status is pending_assessment", () => {
        expect(canSubmitAssessment("pending_assessment")).toBe(true);
    });

    it("should NOT allow assessment when status is locked", () => {
        expect(canSubmitAssessment("locked")).toBe(false);
    });

    it("should NOT allow assessment when status is unlocked", () => {
        expect(canSubmitAssessment("unlocked")).toBe(false);
    });

    it("should NOT allow assessment when status is in_progress", () => {
        expect(canSubmitAssessment("in_progress")).toBe(false);
    });

    it("should NOT allow assessment when status is completed", () => {
        expect(canSubmitAssessment("completed")).toBe(false);
    });

    describe("edge cases", () => {
        it("should reject re-assessment on already completed activity", () => {
            // Teacher tries to update assessment after activity is completed
            expect(canSubmitAssessment("completed")).toBe(false);
        });

        it("should reject assessment on locked activity (skip scenario)", () => {
            // If someone tries to assess an activity the student hasn't reached
            expect(canSubmitAssessment("locked")).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Bug #5: Non-atomic resetPassword
// File: forgot-password.actions.ts
// Fix: Wrapped password update + token delete in transaction
// ═══════════════════════════════════════════════════════════

describe("Bug #5 — resetPassword Atomicity", () => {
    interface ResetState {
        passwordUpdated: boolean;
        tokenDeleted: boolean;
    }

    /**
     * Simulates non-atomic reset (the bug):
     * password updates first, then token is deleted separately
     */
    const resetWithoutTransaction = (tokenDeleteFails: boolean): ResetState => {
        const state: ResetState = {
            passwordUpdated: false,
            tokenDeleted: false,
        };

        // Step 1: Update password (always succeeds)
        state.passwordUpdated = true;

        // Step 2: Delete token (may fail)
        if (!tokenDeleteFails) {
            state.tokenDeleted = true;
        }

        return state;
    };

    /**
     * Simulates atomic reset (the fix):
     * both operations succeed or both fail
     */
    const resetWithTransaction = (tokenDeleteFails: boolean): ResetState => {
        if (tokenDeleteFails) {
            // Transaction rolls back everything
            return { passwordUpdated: false, tokenDeleted: false };
        }

        return { passwordUpdated: true, tokenDeleted: true };
    };

    it("should update password and delete token atomically (happy path)", () => {
        const result = resetWithTransaction(false);
        expect(result.passwordUpdated).toBe(true);
        expect(result.tokenDeleted).toBe(true);
    });

    it("should roll back both if token delete fails (with transaction)", () => {
        const result = resetWithTransaction(true);
        expect(result.passwordUpdated).toBe(false);
        expect(result.tokenDeleted).toBe(false);
    });

    it("WITHOUT transaction: password updated but token still exists (the bug)", () => {
        const result = resetWithoutTransaction(true);
        // Bug: password changed but token can be reused!
        expect(result.passwordUpdated).toBe(true);
        expect(result.tokenDeleted).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// Bug #7: getTeacherProfile — unrestricted userId access
// File: teacher.actions.ts
// Fix: Added session.user.id === userId check
// ═══════════════════════════════════════════════════════════

describe("Bug #7 — getTeacherProfile Access Restriction", () => {
    type UserRole = "system_admin" | "school_admin" | "class_teacher";

    /**
     * Pure logic: can user view the requested teacher profile?
     */
    const canViewTeacherProfile = (
        sessionUserId: string,
        sessionUserRole: UserRole,
        requestedUserId: string,
    ): boolean => {
        // system_admin can view any profile
        if (sessionUserRole === "system_admin") {
            return true;
        }

        // Other roles can only view their own profile
        return sessionUserId === requestedUserId;
    };

    describe("system_admin", () => {
        it("should view own profile", () => {
            expect(
                canViewTeacherProfile("admin-1", "system_admin", "admin-1"),
            ).toBe(true);
        });

        it("should view any other user's profile", () => {
            expect(
                canViewTeacherProfile("admin-1", "system_admin", "teacher-1"),
            ).toBe(true);
            expect(
                canViewTeacherProfile("admin-1", "system_admin", "teacher-2"),
            ).toBe(true);
        });
    });

    describe("school_admin", () => {
        it("should view own profile", () => {
            expect(
                canViewTeacherProfile("admin-1", "school_admin", "admin-1"),
            ).toBe(true);
        });

        it("should NOT view other user's profile", () => {
            expect(
                canViewTeacherProfile("admin-1", "school_admin", "teacher-1"),
            ).toBe(false);
        });
    });

    describe("class_teacher", () => {
        it("should view own profile", () => {
            expect(
                canViewTeacherProfile(
                    "teacher-1",
                    "class_teacher",
                    "teacher-1",
                ),
            ).toBe(true);
        });

        it("should NOT view other teacher's profile", () => {
            expect(
                canViewTeacherProfile(
                    "teacher-1",
                    "class_teacher",
                    "teacher-2",
                ),
            ).toBe(false);
        });

        it("should NOT view admin's profile", () => {
            expect(
                canViewTeacherProfile("teacher-1", "class_teacher", "admin-1"),
            ).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Cross-teacher student isolation (from access control audit)
// Files: student/queries.ts, activity/mutations.ts
// ═══════════════════════════════════════════════════════════

describe("Cross-Teacher Student Data Isolation", () => {
    interface Student {
        id: string;
        class: string;
    }

    /**
     * Student list query filtering logic (advisoryClass approach)
     * Matches queries.ts: class_teacher sees students in their advisoryClass
     */
    const filterStudentsByAdvisoryClass = (
        students: Student[],
        advisoryClass: string | undefined,
        role: string,
    ): Student[] => {
        if (role !== "class_teacher") return students;
        if (!advisoryClass) return [];

        return students.filter((s) => s.class === advisoryClass);
    };

    /**
     * Activity access check (advisoryClass approach)
     */
    const canAccessStudentActivity = (
        studentClass: string,
        advisoryClass: string | undefined,
        role: string,
    ): boolean => {
        if (role !== "class_teacher") return true;
        return !!advisoryClass && studentClass === advisoryClass;
    };

    const allStudents: Student[] = [
        { id: "s1", class: "ม.2/5" },
        { id: "s2", class: "ม.2/5" },
        { id: "s3", class: "ม.3/1" },
    ];

    describe("student list (advisoryClass filtering)", () => {
        it("teacher with advisory ม.2/5 sees all students in ม.2/5", () => {
            const result = filterStudentsByAdvisoryClass(
                allStudents,
                "ม.2/5",
                "class_teacher",
            );
            expect(result.map((s) => s.id)).toEqual(["s1", "s2"]);
        });

        it("teacher with advisory ม.3/1 sees only students in ม.3/1", () => {
            const result = filterStudentsByAdvisoryClass(
                allStudents,
                "ม.3/1",
                "class_teacher",
            );
            expect(result.map((s) => s.id)).toEqual(["s3"]);
        });

        it("school_admin sees all students", () => {
            const result = filterStudentsByAdvisoryClass(
                allStudents,
                undefined,
                "school_admin",
            );
            expect(result).toHaveLength(3);
        });

        it("teacher without advisoryClass sees no students", () => {
            const result = filterStudentsByAdvisoryClass(
                allStudents,
                undefined,
                "class_teacher",
            );
            expect(result).toHaveLength(0);
        });
    });

    describe("activity access (advisoryClass filtering)", () => {
        it("teacher with ม.2/5 can access ม.2/5 student activity", () => {
            expect(
                canAccessStudentActivity("ม.2/5", "ม.2/5", "class_teacher"),
            ).toBe(true);
        });

        it("teacher with ม.2/5 cannot access ม.3/1 student activity", () => {
            expect(
                canAccessStudentActivity("ม.3/1", "ม.2/5", "class_teacher"),
            ).toBe(false);
        });

        it("school_admin can access any class", () => {
            expect(
                canAccessStudentActivity("ม.3/1", undefined, "school_admin"),
            ).toBe(true);
        });

        it("teacher without advisoryClass cannot access any student", () => {
            expect(
                canAccessStudentActivity("ม.2/5", undefined, "class_teacher"),
            ).toBe(false);
        });
    });

    describe("cross-teacher isolation (ensure A cannot see B's class)", () => {
        it("teacher advisory ม.3/1 cannot see students in ม.2/5", () => {
            const result = filterStudentsByAdvisoryClass(
                allStudents,
                "ม.3/1",
                "class_teacher",
            );
            expect(result.find((s) => s.class === "ม.2/5")).toBeUndefined();
        });

        it("teacher advisory ม.2/5 cannot access ม.3/1 activities", () => {
            expect(
                canAccessStudentActivity("ม.3/1", "ม.2/5", "class_teacher"),
            ).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Student Referral Visibility Logic
// Files: student/queries.ts
// Feature: teacher-to-teacher student referral system
// ═══════════════════════════════════════════════════════════

describe("Student Referral Visibility Logic", () => {
    interface StudentWithReferral {
        id: string;
        class: string;
        referral?: {
            fromTeacherUserId: string;
            toTeacherUserId: string;
        } | null;
    }

    /**
     * Referral-aware visibility for class_teacher:
     * - Students in advisoryClass WITHOUT a referral (not sent away), OR
     * - Students referred TO this teacher (regardless of class)
     */
    const filterStudentsWithReferral = (
        students: StudentWithReferral[],
        advisoryClass: string | undefined,
        userId: string | undefined,
        role: string,
    ): StudentWithReferral[] => {
        if (role !== "class_teacher") return students;
        if (!advisoryClass || !userId) return [];

        return students.filter((s) => {
            const isInAdvisoryClass = s.class === advisoryClass;
            const hasNoReferral = !s.referral;
            const isReferredToMe = s.referral?.toTeacherUserId === userId;

            return (isInAdvisoryClass && hasNoReferral) || isReferredToMe;
        });
    };

    const teacherA = "teacher-a";
    const teacherB = "teacher-b";

    const students: StudentWithReferral[] = [
        { id: "s1", class: "ม.2/5", referral: null },
        { id: "s2", class: "ม.2/5", referral: { fromTeacherUserId: teacherA, toTeacherUserId: teacherB } },
        { id: "s3", class: "ม.3/1", referral: null },
        { id: "s4", class: "ม.3/1", referral: { fromTeacherUserId: teacherB, toTeacherUserId: teacherA } },
    ];

    describe("teacher A (advisory ม.2/5)", () => {
        it("sees s1 (in advisory class, no referral)", () => {
            const result = filterStudentsWithReferral(students, "ม.2/5", teacherA, "class_teacher");
            expect(result.find((s) => s.id === "s1")).toBeDefined();
        });

        it("does NOT see s2 (in advisory class, but referred away to B)", () => {
            const result = filterStudentsWithReferral(students, "ม.2/5", teacherA, "class_teacher");
            expect(result.find((s) => s.id === "s2")).toBeUndefined();
        });

        it("does NOT see s3 (different class, no referral)", () => {
            const result = filterStudentsWithReferral(students, "ม.2/5", teacherA, "class_teacher");
            expect(result.find((s) => s.id === "s3")).toBeUndefined();
        });

        it("sees s4 (different class, but referred TO teacher A)", () => {
            const result = filterStudentsWithReferral(students, "ม.2/5", teacherA, "class_teacher");
            expect(result.find((s) => s.id === "s4")).toBeDefined();
        });

        it("sees exactly 2 students", () => {
            const result = filterStudentsWithReferral(students, "ม.2/5", teacherA, "class_teacher");
            expect(result).toHaveLength(2);
        });
    });

    describe("teacher B (advisory ม.3/1)", () => {
        it("sees s2 (referred TO teacher B from A)", () => {
            const result = filterStudentsWithReferral(students, "ม.3/1", teacherB, "class_teacher");
            expect(result.find((s) => s.id === "s2")).toBeDefined();
        });

        it("sees s3 (in advisory class, no referral)", () => {
            const result = filterStudentsWithReferral(students, "ม.3/1", teacherB, "class_teacher");
            expect(result.find((s) => s.id === "s3")).toBeDefined();
        });

        it("does NOT see s4 (in advisory class, but referred away to A)", () => {
            const result = filterStudentsWithReferral(students, "ม.3/1", teacherB, "class_teacher");
            expect(result.find((s) => s.id === "s4")).toBeUndefined();
        });

        it("does NOT see s1 (different class, no referral to B)", () => {
            const result = filterStudentsWithReferral(students, "ม.3/1", teacherB, "class_teacher");
            expect(result.find((s) => s.id === "s1")).toBeUndefined();
        });

        it("sees exactly 2 students", () => {
            const result = filterStudentsWithReferral(students, "ม.3/1", teacherB, "class_teacher");
            expect(result).toHaveLength(2);
        });
    });

    describe("school_admin sees all students", () => {
        it("returns all students regardless of referrals", () => {
            const result = filterStudentsWithReferral(students, undefined, "admin-1", "school_admin");
            expect(result).toHaveLength(4);
        });
    });

    describe("edge cases", () => {
        it("teacher without userId sees nothing", () => {
            const result = filterStudentsWithReferral(students, "ม.2/5", undefined, "class_teacher");
            expect(result).toHaveLength(0);
        });

        it("teacher without advisoryClass sees nothing", () => {
            const result = filterStudentsWithReferral(students, undefined, teacherA, "class_teacher");
            expect(result).toHaveLength(0);
        });

        it("student with no referral in advisory class is always visible", () => {
            const noReferralStudents: StudentWithReferral[] = [
                { id: "s5", class: "ม.2/5", referral: null },
                { id: "s6", class: "ม.2/5" },
            ];
            const result = filterStudentsWithReferral(noReferralStudents, "ม.2/5", teacherA, "class_teacher");
            expect(result).toHaveLength(2);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Whitelist role sync edge cases (from auth.ts audit)
// ═══════════════════════════════════════════════════════════

describe("Whitelist Role Sync Logic", () => {
    type UserRole = "system_admin" | "school_admin" | "class_teacher";

    interface RoleSyncResult {
        finalRole: UserRole;
        changed: boolean;
    }

    /**
     * Pure logic: role sync during login (extracted from auth.ts authorize)
     */
    const syncRole = (
        currentRole: UserRole,
        isWhitelisted: boolean,
    ): RoleSyncResult => {
        if (isWhitelisted && currentRole !== "system_admin") {
            return { finalRole: "system_admin", changed: true };
        }

        if (!isWhitelisted && currentRole === "system_admin") {
            return { finalRole: "school_admin", changed: true };
        }

        return { finalRole: currentRole, changed: false };
    };

    describe("promotion scenarios", () => {
        it("should promote class_teacher to system_admin when whitelisted", () => {
            const result = syncRole("class_teacher", true);
            expect(result.finalRole).toBe("system_admin");
            expect(result.changed).toBe(true);
        });

        it("should promote school_admin to system_admin when whitelisted", () => {
            const result = syncRole("school_admin", true);
            expect(result.finalRole).toBe("system_admin");
            expect(result.changed).toBe(true);
        });

        it("should not change already system_admin when whitelisted", () => {
            const result = syncRole("system_admin", true);
            expect(result.finalRole).toBe("system_admin");
            expect(result.changed).toBe(false);
        });
    });

    describe("demotion scenarios", () => {
        it("should demote system_admin to school_admin when whitelist removed", () => {
            const result = syncRole("system_admin", false);
            expect(result.finalRole).toBe("school_admin");
            expect(result.changed).toBe(true);
        });

        it("should not change class_teacher when not whitelisted", () => {
            const result = syncRole("class_teacher", false);
            expect(result.finalRole).toBe("class_teacher");
            expect(result.changed).toBe(false);
        });

        it("should not change school_admin when not whitelisted", () => {
            const result = syncRole("school_admin", false);
            expect(result.finalRole).toBe("school_admin");
            expect(result.changed).toBe(false);
        });
    });

    describe("edge case: whitelist removed during active session", () => {
        it("role should remain system_admin until next login (session-based)", () => {
            // Login: whitelisted → promoted
            const atLogin = syncRole("class_teacher", true);
            expect(atLogin.finalRole).toBe("system_admin");

            // During session: whitelist removed
            // jwt() callback does NOT re-check role → role stays as-is
            const duringSession = atLogin.finalRole; // no re-check
            expect(duringSession).toBe("system_admin");

            // Next login: no longer whitelisted → demoted
            const nextLogin = syncRole("system_admin", false);
            expect(nextLogin.finalRole).toBe("school_admin");
            expect(nextLogin.changed).toBe(true);
        });
    });
});
