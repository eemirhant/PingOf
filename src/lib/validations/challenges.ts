import { z } from "zod";

export const createChallengeSchema = z
  .object({
    toUserId: z.string().min(1, "Rakip seçilmeli"),
    proposedAt: z.coerce.date().optional().nullable(),
    note: z
      .string()
      .max(200, "Not en fazla 200 karakter olabilir")
      .optional()
      .nullable()
      .transform((v) => {
        if (v == null) return null;
        const trimmed = v.trim();
        return trimmed.length === 0 ? null : trimmed;
      }),
  })
  .superRefine((data, ctx) => {
    if (data.proposedAt && data.proposedAt.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Geçmiş bir tarih/saat seçilemez",
        path: ["proposedAt"],
      });
    }
  });

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
