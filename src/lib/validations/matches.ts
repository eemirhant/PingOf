import { z } from "zod";

import { SETS_TO_WIN } from "@/domain/match-scoring";
import { playersPerTeam } from "@/domain/match-status";

const setScoreSchema = z.object({
  team1Score: z.coerce.number().int().nonnegative("Skor negatif olamaz"),
  team2Score: z.coerce.number().int().nonnegative("Skor negatif olamaz"),
});

const stakeNoteSchema = z
  .string()
  .max(200, "İddia en fazla 200 karakter olabilir")
  .optional()
  .nullable()
  .transform((v) => {
    if (v == null) return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  });

export const instantMatchSchema = z
  .object({
    format: z.enum(["SINGLES", "DOUBLES"]),
    team1PlayerIds: z.array(z.string().min(1)).min(1),
    team2PlayerIds: z.array(z.string().min(1)).min(1),
    sets: z.array(setScoreSchema).min(SETS_TO_WIN).max(5),
    stakeNote: stakeNoteSchema,
  })
  .superRefine((data, ctx) => {
    const expectedPerTeam = data.format === "SINGLES" ? 1 : 2;

    if (data.team1PlayerIds.length !== expectedPerTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          data.format === "SINGLES"
            ? "1v1 için Takım 1'de 1 oyuncu olmalı"
            : "2v2 için Takım 1'de 2 oyuncu olmalı",
        path: ["team1PlayerIds"],
      });
    }

    if (data.team2PlayerIds.length !== expectedPerTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          data.format === "SINGLES"
            ? "1v1 için Takım 2'de 1 oyuncu olmalı"
            : "2v2 için Takım 2'de 2 oyuncu olmalı",
        path: ["team2PlayerIds"],
      });
    }

    const all = [...data.team1PlayerIds, ...data.team2PlayerIds];
    if (new Set(all).size !== all.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aynı oyuncu bir maçta birden fazla kez seçilemez",
        path: ["team1PlayerIds"],
      });
    }
  });

export type InstantMatchInput = z.infer<typeof instantMatchSchema>;

/** Planned match: future datetime, optional open slots (partial teams). */
export const plannedMatchSchema = z
  .object({
    format: z.enum(["SINGLES", "DOUBLES"]),
    scheduledAt: z.coerce.date({
      required_error: "Tarih/saat gerekli",
      invalid_type_error: "Geçersiz tarih/saat",
    }),
    team1PlayerIds: z.array(z.string().min(1)).default([]),
    team2PlayerIds: z.array(z.string().min(1)).default([]),
    stakeNote: stakeNoteSchema,
  })
  .superRefine((data, ctx) => {
    if (data.scheduledAt.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Geçmiş bir tarih/saat seçilemez",
        path: ["scheduledAt"],
      });
    }

    const maxPerTeam = playersPerTeam(data.format);

    if (data.team1PlayerIds.length > maxPerTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Takım 1 en fazla ${maxPerTeam} oyuncu olabilir`,
        path: ["team1PlayerIds"],
      });
    }

    if (data.team2PlayerIds.length > maxPerTeam) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Takım 2 en fazla ${maxPerTeam} oyuncu olabilir`,
        path: ["team2PlayerIds"],
      });
    }

    const all = [...data.team1PlayerIds, ...data.team2PlayerIds];
    if (new Set(all).size !== all.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aynı oyuncu bir maçta birden fazla kez seçilemez",
        path: ["team1PlayerIds"],
      });
    }
  });

export type PlannedMatchInput = z.infer<typeof plannedMatchSchema>;

/** Result entry for a planned/pending match (participants already on match). */
export const plannedMatchResultSchema = z.object({
  sets: z.array(setScoreSchema).min(SETS_TO_WIN).max(5),
});

export type PlannedMatchResultInput = z.infer<typeof plannedMatchResultSchema>;

export const setStakeSettledSchema = z.object({
  settled: z.coerce.boolean(),
});

export type SetStakeSettledInput = z.infer<typeof setStakeSettledSchema>;
