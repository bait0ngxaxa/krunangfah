import type { Gender, ProjectRole, StudentStatus, UserRole } from "@prisma/client";

export type SystemEntityKind = "school" | "user" | "teacher" | "student";
export type SystemAdminEventTargetKind =
    | SystemEntityKind
    | "counselingSession"
    | "homeVisit"
    | "phqResult"
    | "activityProgress"
    | "studentReferral";

export interface SchoolEntityResult {
    type: "school";
    id: string;
    name: string;
    province: string | null;
    disabledAt: Date | null;
    isTestData: boolean;
    userCount: number;
    studentCount: number;
}

export interface UserEntityResult {
    type: "user";
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    isPrimary: boolean;
    deletedAt: Date | null;
    schoolId: string | null;
    schoolName: string | null;
    teacherName: string | null;
    advisoryClass: string | null;
}

export interface TeacherEntityResult {
    type: "teacher";
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    age: number;
    advisoryClass: string;
    schoolRole: string;
    projectRole: ProjectRole;
    userRole: UserRole;
    deletedAt: Date | null;
    schoolId: string | null;
    schoolName: string | null;
}

export interface StudentEntityResult {
    type: "student";
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    nationalIdMasked: string | null;
    nationalId: string | null;
    gender: Gender | null;
    age: number | null;
    class: string;
    status: StudentStatus;
    disabledAt: Date | null;
    isTestData: boolean;
    schoolId: string;
    schoolName: string;
    schoolDisabledAt: Date | null;
    schoolIsTestData: boolean;
}

export type SystemEntityResult =
    | SchoolEntityResult
    | UserEntityResult
    | TeacherEntityResult
    | StudentEntityResult;

export interface SystemSearchResult {
    schools: SchoolEntityResult[];
    users: UserEntityResult[];
    teachers: TeacherEntityResult[];
    students: StudentEntityResult[];
}

export interface SystemAdminEditChange {
    field: string;
    label: string;
    before: string | number | boolean | null;
    after: string | number | boolean | null;
}

export interface SystemAdminEditEventItem {
    id: string;
    targetType: SystemAdminEventTargetKind;
    targetId: string;
    reason: string;
    actorEmail: string | null;
    targetLabel: string;
    changes: SystemAdminEditChange[];
    createdAt: Date;
}

export interface SystemEditResponse<T> {
    success: boolean;
    message: string;
    updated?: T;
}

export interface SystemCareRecordResponse {
    phqResults: SystemPhqRecord[];
    activityProgress: SystemActivityRecord[];
    referral: SystemReferralRecord | null;
    teacherOptions: SystemTeacherOption[];
    counselingSessions: SystemCounselingRecord[];
    homeVisits: SystemHomeVisitRecord[];
}

export interface SystemPhqRecord {
    id: string;
    academicYearLabel: string;
    assessmentRound: number;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    q5: number;
    q6: number;
    q7: number;
    q8: number;
    q9: number;
    q9a: boolean;
    q9b: boolean;
    totalScore: number;
    riskLevel: string;
    referredToHospital: boolean;
    hospitalName: string | null;
    createdAt: Date;
}

export interface SystemPhqRollbackResult {
    deletedPhqIds: string[];
}

export interface SystemActivityRecord {
    id: string;
    phqResultId: string;
    academicYearLabel: string;
    assessmentRound: number;
    activityNumber: number;
    status: string;
    scheduledDate: Date | null;
    completedAt: Date | null;
    teacherId: string | null;
    teacherName: string | null;
    teacherNotes: string | null;
    internalProblems: string | null;
    externalProblems: string | null;
    problemType: string | null;
}

export interface SystemReferralRecord {
    id: string;
    fromTeacherUserId: string;
    toTeacherUserId: string;
    fromTeacherName: string | null;
    toTeacherName: string | null;
    createdAt: Date;
}

export interface SystemTeacherOption {
    userId: string;
    name: string;
    role: string;
    advisoryClass: string | null;
}

export interface SystemCounselingRecord {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}

export interface SystemHomeVisitRecord {
    id: string;
    visitNumber: number;
    visitDate: Date;
    description: string;
    nextScheduledDate: Date | null;
    teacherName: string;
    teacherRole: string;
    photoCount: number;
    createdAt: Date;
}
