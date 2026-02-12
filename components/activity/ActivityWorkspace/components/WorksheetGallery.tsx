import Image from "next/image";
import { ImageIcon, ZoomIn } from "lucide-react";

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
                <span className="bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    ใบงาน{activityTitle}
                </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                {worksheets.map((worksheet, wIndex) => (
                    <div key={wIndex} className="relative group">
                        <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-pink-100/50 border-4 border-white transition-all transform group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-pink-200 group-hover:rotate-1">
                            <Image
                                src={worksheet}
                                alt={`${activityTitle} ใบงาน ${wIndex + 1}`}
                                width={400}
                                height={500}
                                className="w-full h-auto object-cover"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
                                <span className="text-white font-bold bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/50">
                                    <ZoomIn className="w-4 h-4 inline-block mr-1" /> คลิกเพื่อดูรูปขยาย
                                </span>
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-pink-600 border border-pink-100 px-4 py-1.5 rounded-full shadow-lg font-bold z-10">
                            ใบที่ {wIndex + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
