/**
 * Types for Primary Admin Management
 * ใช้จัดการสิทธิ์ primary admin ของ school_admin ในโรงเรียน
 */

/** รายการ school_admin ในโรงเรียน */
export interface SchoolAdminItem {
    id: string;
    email: string;
    isPrimary: boolean;
    teacherName?: string;
}

/** ผลลัพธ์จาก togglePrimaryStatus */
export interface PrimaryToggleResponse {
    success: boolean;
    message: string;
}
