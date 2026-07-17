import type {
    Gender,
    ProjectRole,
    StudentStatus,
    SystemAdminEventAction,
    SystemAdminEventTargetType,
    UserRole,
} from "@prisma/client";
import type { DataManagementEventItem } from "@/lib/actions/data-management/types";

export type SystemEntityKind = "school" | "staff" | "student";
export type SystemAdminEventActionKind = SystemAdminEventAction;
export type SystemAdminEventTargetKind = SystemAdminEventTargetType;

export interface SchoolEntityResult {
    type: "school";
    id: string;
    updatedAt: Date;
    name: string;
    province: string | null;
    disabledAt: Date | null;
    isTestData: boolean;
    userCount: number;
    studentCount: number;
}

export interface StaffEntityResult {
    type: "staff";
    id: string;
    userUpdatedAt: Date;
    teacherUpdatedAt: Date | null;
    email: string;
    name: string | null;
    role: UserRole;
    isPrimary: boolean;
    deletedAt: Date | null;
    schoolId: string | null;
    schoolName: string | null;
    hasTeacherProfile: boolean;
    teacherId: string | null;
    teacherName: string | null;
    firstName: string | null;
    lastName: string | null;
    age: number | null;
    advisoryClass: string | null;
    schoolRole: string | null;
    projectRole: ProjectRole | null;
}

export interface StudentEntityResult {
    type: "student";
    id: string;
    updatedAt: Date;
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
    classOptions: SystemClassOption[];
}

export type SystemEntityResult =
    | SchoolEntityResult
    | StaffEntityResult
    | StudentEntityResult;

export interface SystemSearchResult {
    schools: SchoolEntityResult[];
    staffs: StaffEntityResult[];
    students: StudentEntityResult[];
}

export interface SystemClassOption {
    id: string;
    name: string;
}

export interface SystemAdminEditChange {
    field: string;
    label: string;
    before: string | number | boolean | null;
    after: string | number | boolean | null;
}

export interface SystemAdminEditEventItem {
    id: string;
    action: SystemAdminEventActionKind;
    targetType: SystemAdminEventTargetKind;
    targetId: string;
    reason: string;
    actorEmail: string | null;
    targetLabel: string;
    changes: SystemAdminEditChange[];
    createdAt: Date;
}

export interface SystemAuditTimelineCursor {
    kind: "edit" | "data-management";
    id: string;
    createdAt: Date;
}

export type SystemAuditTimelineItem =
    | { kind: "edit"; event: SystemAdminEditEventItem }
    | {
          kind: "data-management";
          event: DataManagementEventItem;
      };

export interface SystemAuditTimelineResponse {
    success: boolean;
    message: string;
    events: SystemAuditTimelineItem[];
    nextCursor: SystemAuditTimelineCursor | null;
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
    academicYearId: string;
    academicYearLabel: string;
    isLatestTerm: boolean;
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
    updatedAt: Date;
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
    updatedAt: Date;
}

export interface SystemReferralRecord {
    id: string;
    fromTeacherUserId: string;
    toTeacherUserId: string;
    fromTeacherName: string | null;
    toTeacherName: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SystemTeacherOption {
    userId: string;
    name: string;
    role: string;
    advisoryClass: string | null;
}

export interface SystemCounselingRecord {
    id: string;
    academicYearId: string | null;
    academicYearLabel: string | null;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SystemHomeVisitRecord {
    id: string;
    academicYearId: string | null;
    academicYearLabel: string | null;
    visitNumber: number;
    visitDate: Date;
    description: string;
    nextScheduledDate: Date | null;
    teacherName: string;
    teacherRole: string;
    photoCount: number;
    createdAt: Date;
    updatedAt: Date;
}
