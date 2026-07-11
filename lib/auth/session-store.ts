/**
 * Public seam for stateful authentication sessions.
 *
 * Keep callers on this façade while the implementation remains grouped by
 * sign-in, cookie access, request resolution, and session lifecycle.
 */
export {
    attachSessionCookie,
    clearSessionCookie,
    getCurrentSessionToken,
    getSessionCookieMaxAge,
    SESSION_COOKIE_NAME,
} from "./session-store/session-cookie";
export {
    invalidateUserSessionCaches,
    revokeOtherUserSessions,
    revokeSessionToken,
    revokeUserSessionById,
    revokeUserSessions,
    rotateCurrentSessionToken,
} from "./session-store/session-lifecycle";
export {
    getCurrentSessionId,
    getRequestSession,
    updateCurrentSessionMetadata,
} from "./session-store/session-request";
export {
    signInWithPassword,
    type StatefulSignInResult,
} from "./session-store/session-signin";
