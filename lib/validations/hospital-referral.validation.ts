import { z } from "zod";

export const updateHospitalReferralSchema = z
    .object({
        phqResultId: z.string().cuid("Invalid PHQ result ID"),
        referredToHospital: z.boolean(),
        hospitalName: z.string().max(200, "ชื่อโรงพยาบาลต้องไม่เกิน 200 ตัวอักษร").optional(),
    })
    .refine(
        (data) => !data.referredToHospital || (data.hospitalName && data.hospitalName.trim().length > 0),
        {
            message: "กรุณาระบุชื่อโรงพยาบาล",
            path: ["hospitalName"],
        },
    );

export type UpdateHospitalReferralInput = z.infer<typeof updateHospitalReferralSchema>;
