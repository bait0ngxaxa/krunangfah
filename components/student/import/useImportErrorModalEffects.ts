"use client";

import { type RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute("aria-hidden"))
        .filter((element) => element.tabIndex >= 0);
}

export function useImportErrorModalEffects({
    isOpen,
    onClose,
    modalRef,
}: {
    isOpen: boolean;
    onClose: () => void;
    modalRef: RefObject<HTMLDivElement | null>;
}): void {
    useEffect(() => {
        if (!isOpen) return;

        const previousActiveElement = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        window.requestAnimationFrame(() => {
            const modal = modalRef.current;
            const firstFocusable = modal ? getFocusableElements(modal)[0] : null;
            (firstFocusable ?? modal)?.focus();
        });

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                onClose();
                return;
            }

            if (event.key !== "Tab" || !modalRef.current) return;

            const focusableElements = getFocusableElements(modalRef.current);
            const firstElement = focusableElements[0];
            const lastElement = focusableElements.at(-1);
            if (!firstElement || !lastElement) {
                event.preventDefault();
                modalRef.current.focus();
                return;
            }

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
                return;
            }

            if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
            if (previousActiveElement instanceof HTMLElement) {
                previousActiveElement.focus();
            }
        };
    }, [isOpen, modalRef, onClose]);
}
