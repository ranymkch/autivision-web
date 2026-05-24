import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  age: z.coerce.number().int().min(0).max(30).optional().nullable(),
  sexe: z.enum(["M", "F", "AUTRE"]),
  notes: z.string().max(2000).optional().nullable(),
  photo_url: z.string().url("A photo is required").min(1, "A photo is required"),
});

export type PatientInput = z.infer<typeof patientSchema>;
