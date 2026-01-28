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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 border border-pink-100">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-gray-600 mb-4">{description}</p>
            )}
            <Link
                href={href}
                className={`block w-full py-3 px-4 rounded-full font-bold text-center transition-all duration-300 transform hover:-translate-y-0.5 ${buttonStyles[variant]}`}
            >
                {buttonText}
            </Link>
        </div>
    );
}
