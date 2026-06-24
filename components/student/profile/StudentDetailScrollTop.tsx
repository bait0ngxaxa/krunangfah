"use client";

import { useLayoutEffect } from "react";

export function StudentDetailScrollTop(): null {
    useLayoutEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, []);

    return null;
}
