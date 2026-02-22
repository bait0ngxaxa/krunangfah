/**
 * Student Referral Types
 * Types for teacher-to-teacher student referral system
 */

/** Referral info attached to a student */
export interface ReferralInfo {
    id: string;
    studentId: string;
    fromTeacherUserId: string;
    toTeacherUserId: string;
    fromTeacherName: string;
    toTeacherName: string;
    createdAt: Date;
}

/** Response from referral create/revoke actions */
export interface ReferralActionResponse {
    success: boolean;
    message: string;
    data?: ReferralInfo;
}

/** Teacher option in the referral picker modal */
export interface TeacherPickerOption {
    userId: string;
    name: string;
    advisoryClass: string;
}

/** A student that was referred out by the current teacher */
export interface ReferredOutStudent {
    id: string;
    firstName: string;
    lastName: string;
    class: string;
    studentId: string;
    toTeacherName: string;
    referralId: string;
    referredAt: Date;
}
