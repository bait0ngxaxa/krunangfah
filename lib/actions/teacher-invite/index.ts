// Teacher invite actions - Re-exports for backward compatibility

export type {
    TeacherInvite,
    TeacherInviteWithAcademicYear,
    InviteResponse,
    InviteListResponse,
} from "./types";

export { getTeacherInvite, getMyTeacherInvites } from "./queries";

export { createTeacherInvite, acceptTeacherInvite } from "./mutations";
