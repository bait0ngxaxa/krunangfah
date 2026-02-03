import Image from "next/image";

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
        <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
                ใบงาน{activityTitle}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {worksheets.map((worksheet, wIndex) => (
                    <div key={wIndex} className="relative">
                        <div className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                            <Image
                                src={worksheet}
                                alt={`${activityTitle} ใบงาน ${wIndex + 1}`}
                                width={400}
                                height={500}
                                className="w-full h-auto object-cover"
                            />
                        </div>
                        <div className="absolute top-3 right-3 bg-white/95 text-gray-700 text-sm px-3 py-1.5 rounded-full shadow-md font-medium">
                            ใบที่ {wIndex + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
