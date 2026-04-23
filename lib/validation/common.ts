import { z } from "zod";

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export const uuidSchema = z.string().uuid();

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(slugPattern, "Use lowercase words separated by hyphens.");

export const nonEmptyTextSchema = z.string().trim().min(1);

export const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const timestampSchema = z.iso.datetime({ offset: true });

export const latitudeSchema = z.coerce.number().min(-90).max(90);

export const longitudeSchema = z.coerce.number().min(-180).max(180);

export const timeSchema = z.string().regex(timePattern, "Use HH:MM 24-hour time.");

export const priceBandSchema = z.enum(["budget", "standard", "premium"]);

export const dayOfWeekSchema = z.coerce.number().int().min(0).max(6);

export const booleanLikeSchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
