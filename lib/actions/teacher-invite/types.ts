// Teacher invite related type definitions

export interface TeacherInvite {
    id: string;
    token: string;
    email: string;
    firstName: string;
    lastName: string;
    age: number;
    userRole: string;
    advisoryClass: string;
    academicYearId: string;
    schoolId: string;
    schoolRole: string;
    projectRole: string;
    invitedById: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
}

// Type for invite with relations (used when fetching with include)
export interface TeacherInviteWithRelations extends TeacherInvite {
    school: { name: string };
    academicYear: { year: number; semester: number };
}

export interface InviteResponse {
    success: boolean;
    message: string;
    invite?: TeacherInviteWithRelations;
    inviteLink?: string;
}

// Type for invite with academicYear (used in list queries)
export interface TeacherInviteWithAcademicYear extends TeacherInvite {
    academicYear: { year: number; semester: number };
}

export interface InviteListResponse {
    success: boolean;
    invites: TeacherInviteWithAcademicYear[];
}
