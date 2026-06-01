import type { Session } from "next-auth";
import { getRequestSession } from "@/lib/auth/session-store";

export async function auth(): Promise<Session | null> {
    return getRequestSession();
}
