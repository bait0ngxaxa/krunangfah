import { Navbar } from "./Navbar";
import { hasStudents } from "@/lib/actions/navbar.actions";

export async function NavbarWrapper() {
    const teacherHasStudents = await hasStudents();

    return <Navbar hasStudents={teacherHasStudents} />;
}
