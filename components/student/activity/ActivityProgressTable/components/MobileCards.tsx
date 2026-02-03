// components/student/activity/ActivityProgressTable/components/MobileCards.tsx

import type { MobileCardsProps } from "../types";
import { ActivityCard } from "./ActivityCard";

/**
 * Mobile cards view wrapper
 */
export function MobileCards({ progressData }: MobileCardsProps) {
    return (
        <div className="md:hidden space-y-4">
            {progressData.map((progress, index) => (
                <ActivityCard
                    key={progress.id}
                    progress={progress}
                    index={index}
                />
            ))}
        </div>
    );
}
