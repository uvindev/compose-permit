import { z } from "zod";

export const MAX_COMPOSE_BYTES = 1024 * 1024;

export const composeTextSchema = z
  .string()
  .min(1, "Paste or load a Compose document.")
  .max(
    MAX_COMPOSE_BYTES,
    "The Compose document exceeds the 1 MiB character limit.",
  );

export const comparisonInputSchema = z.object({
  baseline: composeTextSchema,
  candidate: composeTextSchema,
});

export type ComparisonInput = z.infer<typeof comparisonInputSchema>;
