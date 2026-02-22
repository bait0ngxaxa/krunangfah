import Image from "next/image";
import { ImageIcon } from "lucide-react";

interface WorksheetGalleryProps {
    activityTitle: string;
    worksheets: string[];
}

/**
 * Gallery displaying worksheet images
 */
export function WorksheetGallery({
    activityTitle,
    worksheets,
}: WorksheetGalleryProps) {
    return (
        <div className="mb-10">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-gray-700" />
                <span className="text-gray-900">ใบงาน{activityTitle}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                {worksheets.map((worksheet, wIndex) => (
                    <div key={wIndex} className="relative group">
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border-2 border-emerald-100 transition-all transform group-hover:scale-[1.02] group-hover:shadow-md group-hover:rotate-1">
                            <Image
                                src={worksheet}
                                alt={`${activityTitle} ใบงาน ${wIndex + 1}`}
                                width={400}
                                height={500}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        <div className="absolute top-4 right-4 bg-white text-emerald-600 border-2 border-emerald-100 px-4 py-1.5 rounded-full shadow-sm font-bold z-10">
                            ใบที่ {wIndex + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
