import type {
    DataManagementAction,
    DataManagementTargetType,
    StudentStatus,
} from "@prisma/client";

export type DataManagementTargetKind = DataManagementTargetType;
export type DataManagementActionKind = DataManagementAction;

export interface DataManagementResponse {
    success: boolean;
    message: string;
}

export interface SearchDataManagementTargetsInput {
    query?: string;
    targetType?: "all" | DataManagementTargetKind;
    dataState?: "all" | "active" | "disabled" | "test";
    schoolId?: string;
    province?: string;
    schoolCursor?: string;
    studentCursor?: string;
}

export interface SchoolSearchResult {
    type: "school";
    id: string;
    name: string;
    province: string | null;
    disabledAt: Date | null;
    isTestData: boolean;
    userCount: number;
    studentCount: number;
}

export interface StudentSearchResult {
    type: "student";
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    nationalIdMasked: string | null;
    class: string;
    status: StudentStatus;
    disabledAt: Date | null;
    isTestData: boolean;
    schoolId: string;
    schoolName: string;
    schoolIsTestData: boolean;
    schoolDisabledAt: Date | null;
}

export interface DataManagementSearchResult {
    schools: SchoolSearchResult[];
    students: StudentSearchResult[];
    schoolNextCursor: string | null;
    studentNextCursor: string | null;
    schoolHasMore: boolean;
    studentHasMore: boolean;
}

export interface ImpactSummary {
    userCount: number;
    studentCount: number;
    activeStudentCount: number;
    phqResultCount: number;
    activityProgressCount: number;
    counselingSessionCount: number;
    homeVisitCount: number;
    worksheetUploadCount: number;
    homeVisitPhotoCount: number;
    pendingTeacherInviteCount: number;
    pendingSchoolAdminInviteCount: number;
    fileCount: number;
}

export interface DataManagementEventItem {
    id: string;
    targetType: DataManagementTargetKind;
    targetId: string;
    action: DataManagementActionKind;
    reason: string;
    actorUserId: string;
    actorEmail: string | null;
    targetLabel: string;
    warnings: string[];
    createdAt: Date;
}

export interface SchoolDataManagementPreview {
    type: "school";
    id: string;
    name: string;
    province: string | null;
    disabledAt: Date | null;
    disabledReason: string | null;
    isTestData: boolean;
    testDataReason: string | null;
    impact: ImpactSummary;
    recentEvents: DataManagementEventItem[];
}

export interface StudentDataManagementPreview {
    type: "student";
    id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    nationalId: string | null;
    class: string;
    status: StudentStatus;
    disabledAt: Date | null;
    disabledReason: string | null;
    isTestData: boolean;
    testDataReason: string | null;
    school: {
        id: string;
        name: string;
        disabledAt: Date | null;
        isTestData: boolean;
    };
    impact: ImpactSummary;
    recentEvents: DataManagementEventItem[];
}

export interface DataManagementEventListResponse {
    events: DataManagementEventItem[];
}
