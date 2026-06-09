import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface ActionCardProps {
    title: string;
    description?: string;
    buttonText: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
    icon?: ReactNode;
}

const VARIANT_STYLES = {
    primary: {
        gradient:
            "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600",
        btn: "bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-300/50",
        iconBg: "bg-emerald-100 text-emerald-500",
    },
    secondary: {
        gradient: "bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500",
        btn: "bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-white shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-300/50",
        iconBg: "bg-teal-100 text-teal-500",
    },
    outline: {
        gradient: "bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-400",
        btn: "bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 hover:border-emerald-300 shadow-sm",
        iconBg: "bg-emerald-50 text-emerald-400",
    },
};

function getVariantStyles(v: "primary" | "secondary" | "outline") {
    switch (v) {
        case "primary":
            return VARIANT_STYLES.primary;
        case "secondary":
            return VARIANT_STYLES.secondary;
        case "outline":
            return VARIANT_STYLES.outline;
    }
}

export function ActionCard({
    title,
    description,
    buttonText,
    href,
    variant = "primary",
    icon,
}: ActionCardProps) {
    const styles = getVariantStyles(variant);

    return (
        <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-base duration-300 hover:shadow-md">
            <div
                className={`${styles.gradient} h-1 origin-top motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-y-125`}
            />

            <div className="p-5 sm:p-6">
                <div className="mb-4 flex min-w-0 items-center gap-3">
                    {icon && (
                        <div
                            className={`shrink-0 rounded-xl p-2.5 shadow-sm ${styles.iconBg}`}
                        >
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="break-words text-base font-bold text-gray-800 transition-colors group-hover:text-emerald-600">
                            {title}
                        </h3>
                        {description && (
                            <p className="mt-0.5 break-words text-sm text-gray-500">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                <Link
                    href={href}
                    className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-bold transition-base duration-300 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 ${styles.btn}`}
                >
                    <span className="min-w-0 break-words">{buttonText}</span>
                    <ChevronRight
                        className="h-4 w-4 shrink-0 opacity-70 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
                        aria-hidden="true"
                    />
                </Link>
            </div>
        </div>
    );
}
