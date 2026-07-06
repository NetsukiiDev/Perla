import { z } from "zod";

export const codeVerifySchema = z.object({
  code: z.string().trim().min(4).max(64),
});

export const sessionStartSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});

export const sessionLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});
