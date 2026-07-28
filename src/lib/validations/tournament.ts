import { z } from "zod";

const pairSchema = z
  .tuple([z.string().min(1), z.string().min(1)])
  .refine(([a, b]) => a !== b, {
    message: "Bir çiftte iki farklı oyuncu olmalı",
  });

export const createTournamentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Turnuva adı en az 2 karakter olmalı")
      .max(80, "Turnuva adı en fazla 80 karakter olabilir"),
    type: z.enum(["KNOCKOUT", "ROUND_ROBIN"], {
      errorMap: () => ({ message: "Turnuva tipi seçilmeli" }),
    }),
    format: z.enum(["SINGLES", "DOUBLES"], {
      errorMap: () => ({ message: "Format seçilmeli" }),
    }),
    startsAt: z.coerce.date({
      required_error: "Başlangıç tarihi gerekli",
      invalid_type_error: "Geçerli bir tarih seç",
    }),
    participantIds: z.array(z.string().min(1)).optional().default([]),
    pairs: z.array(pairSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.format === "SINGLES") {
      const ids = data.participantIds ?? [];
      if (ids.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "En az 2 oyuncu seçilmeli",
          path: ["participantIds"],
        });
      }
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Aynı oyuncu birden fazla seçilemez",
          path: ["participantIds"],
        });
      }
    } else {
      const pairs = data.pairs ?? [];
      if (pairs.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "En az 2 çift seçilmeli",
          path: ["pairs"],
        });
      }
      const flat = pairs.flat();
      if (new Set(flat).size !== flat.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bir oyuncu birden fazla çiftte olamaz",
          path: ["pairs"],
        });
      }
    }
  });

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
