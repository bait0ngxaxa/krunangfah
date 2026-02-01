import Link from "next/link";

interface ActionCardProps {
    title: string;
    description?: string;
    buttonText: string;
    href: string;
    variant?: "primary" | "secondary" | "outline";
}

export function ActionCard({
    title,
    description,
    buttonText,
    href,
    variant = "primary",
}: ActionCardProps) {
    const buttonStyles = {
        primary:
            "bg-linear-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white shadow-md hover:shadow-lg",
        secondary:
            "bg-linear-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md hover:shadow-lg",
        outline:
            "bg-white hover:bg-pink-50 text-pink-500 border-2 border-pink-200 hover:border-pink-300",
    };

    return (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-pink-500/10 p-6 border-2 border-white relative overflow-hidden group hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-300">
            {/* Gradient Border Overlay */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-pink-600 transition-colors">
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
