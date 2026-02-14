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
        gradient: "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600",
        btn: "bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white shadow-md shadow-pink-200/50 hover:shadow-lg hover:shadow-pink-300/50",
        iconBg: "bg-rose-100 text-rose-500",
    },
    secondary: {
        gradient: "bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500",
        btn: "bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white shadow-md shadow-pink-200/50 hover:shadow-lg hover:shadow-pink-300/50",
        iconBg: "bg-pink-100 text-pink-500",
    },
    outline: {
        gradient: "bg-gradient-to-r from-pink-300 via-rose-300 to-pink-400",
        btn: "bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 hover:border-pink-300 shadow-sm",
        iconBg: "bg-pink-50 text-pink-400",
    },
};

export function ActionCard({
    title,
    description,
    buttonText,
    href,
    variant = "primary",
    icon,
}: ActionCardProps) {
    const styles = VARIANT_STYLES[variant];

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] border border-pink-200 ring-1 ring-white/80 overflow-hidden group hover:shadow-[0_8px_24px_-4px_rgba(244,114,182,0.25),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:border-pink-300 transition-all duration-300">
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
                        <h3 className="text-base font-bold text-gray-800 group-hover:text-pink-600 transition-colors truncate">
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
