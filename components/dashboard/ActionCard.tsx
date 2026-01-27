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
        primary: "bg-blue-900 hover:bg-blue-800 text-white",
        secondary: "bg-blue-700 hover:bg-blue-600 text-white",
        outline:
            "bg-white hover:bg-gray-50 text-blue-900 border-2 border-blue-900",
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-gray-600 mb-4">{description}</p>
            )}
            <Link
                href={href}
                className={`block w-full py-3 px-4 rounded-lg font-semibold text-center transition-all duration-200 ${buttonStyles[variant]}`}
            >
                {buttonText}
            </Link>
        </div>
    );
}
