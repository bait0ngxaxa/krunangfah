import Link from "next/link";
import type { ReactNode } from "react";

interface ActionCardProps {
    title: string;
    description?: string;
    buttonText: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
    icon?: ReactNode;
}

export function ActionCard({
    title,
    description,
    buttonText,
    href,
    variant = "primary",
    icon,
}: ActionCardProps) {
    const buttonStyles = {
        primary:
            "bg-linear-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white shadow-md shadow-pink-200 hover:shadow-lg hover:shadow-pink-300",
        secondary:
            "bg-linear-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md hover:shadow-lg",
        outline:
            "bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 hover:border-pink-300 shadow-sm",
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg shadow-pink-100/50 p-6 border border-white/60 relative overflow-hidden group hover:shadow-xl hover:shadow-pink-200/40 transition-all duration-300 ring-1 ring-pink-50">
            {/* Gradient Border Overlay */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-rose-300 via-pink-300 to-orange-200 opacity-60 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-pink-600 transition-colors flex items-center gap-2">
                    {icon && <span className="shrink-0">{icon}</span>}
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-gray-600 mb-4">{description}</p>
                )}
                <Link
                    href={href}
                    className={`block w-full py-3 px-4 rounded-xl font-bold text-center transition-all duration-300 transform hover:-translate-y-1 ${buttonStyles[variant]}`}
                >
                    {buttonText}
                </Link>
            </div>
        </div>
    );
}
