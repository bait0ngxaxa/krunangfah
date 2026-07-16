import { Navbar } from "./Navbar";
import { hasStudents } from "@/lib/actions/navbar.actions";

export async function NavbarWrapper() {
    const result = await hasStudents();
    const hasQueryError = result.status === "transient_error";
    const teacherHasStudents =
        result.status === "success" ? result.data : hasQueryError;

    return <Navbar hasStudents={teacherHasStudents} hasQueryError={hasQueryError} />;
}
