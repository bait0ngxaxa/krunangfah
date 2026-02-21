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
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(16,185,129,0.15)] border border-emerald-200 ring-1 ring-white/80 overflow-hidden group hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.25),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:border-emerald-300 transition-all duration-300">
            <div
                className={`${styles.gradient} h-1 group-hover:h-1.5 transition-all duration-300`}
            />

            <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                    {icon && (
                        <div
                            className={`p-2.5 rounded-xl ${styles.iconBg} shrink-0 shadow-sm`}
                        >
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-800 group-hover:text-emerald-600 transition-colors truncate">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-gray-500 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                <Link
                    href={href}
                    className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm text-center transition-all duration-300 transform hover:-translate-y-0.5 ${styles.btn}`}
                >
                    {buttonText}
                    <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
