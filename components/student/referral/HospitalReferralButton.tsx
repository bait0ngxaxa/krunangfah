"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hospital } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReferralFormModal } from "@/components/student/help/ReferralFormModal";

interface HospitalReferralButtonProps {
    phqResultId: string;
    initialStatus: boolean;
    initialHospitalName?: string | null;
}

export function HospitalReferralButton({
    phqResultId,
    initialStatus,
    initialHospitalName,
}: HospitalReferralButtonProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                type="button"
                variant="danger"
                size="lg"
                className="active:scale-95"
                onClick={() => setIsOpen(true)}
            >
                <Hospital className="h-5 w-5" aria-hidden="true" />
                ส่งต่อโรงพยาบาล
            </Button>

            {isOpen && (
                <ReferralFormModal
                    phqResultId={phqResultId}
                    initialStatus={initialStatus}
                    initialHospitalName={initialHospitalName ?? undefined}
                    onClose={() => setIsOpen(false)}
                    onSuccess={() => router.refresh()}
                />
            )}
        </>
    );
}
