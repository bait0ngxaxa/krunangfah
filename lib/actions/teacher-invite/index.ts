// Teacher invite actions - Re-exports for backward compatibility

export type {
    TeacherInvite,
    TeacherInviteWithAcademicYear,
    InviteResponse,
} from "./types";

export { getTeacherInvite, getMyTeacherInvites } from "./queries";

export {
    createTeacherInvite,
    acceptTeacherInvite,
    revokeTeacherInvite,
} from "./mutations";
