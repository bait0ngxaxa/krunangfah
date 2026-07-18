import type { TeacherInviteWithAcademicYear } from "@/lib/actions/teacher-invite";
import type { TeacherRosterItem } from "./types";

type InviteIdentity = Pick<TeacherInviteWithAcademicYear, "rosterId" | "email">;

export function getAvailableTeacherRoster(
    roster: TeacherRosterItem[],
    blockedInvites: InviteIdentity[],
): TeacherRosterItem[] {
    const blockedRosterIds = new Set(
        blockedInvites
            .map((invite) => invite.rosterId)
            .filter((rosterId): rosterId is string => Boolean(rosterId)),
    );
    const legacyBlockedEmails = new Set(
        blockedInvites
            .filter((invite) => !invite.rosterId)
            .map((invite) => invite.email.toLowerCase()),
    );

    return roster.filter((teacher) => {
        if (!teacher.email) return false;

        return (
            !blockedRosterIds.has(teacher.id) &&
            !legacyBlockedEmails.has(teacher.email.toLowerCase())
        );
    });
}
