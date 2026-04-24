import { z } from "zod";
import {
  booleanLikeSchema,
  dayOfWeekSchema,
  latitudeSchema,
  longitudeSchema,
  nonEmptyTextSchema,
  optionalTextSchema,
  paginationQuerySchema,
  priceBandSchema,
  slugSchema,
  timeSchema,
  timestampSchema,
  uuidSchema,
} from "./common.ts";

export const locationSourceSchema = z.enum([
  "precise",
  "approximate",
  "default_city",
]);

export const vendorSchema = z.object({
  id: uuidSchema,
  name: nonEmptyTextSchema,
  slug: slugSchema,
  short_description: z.string().nullable(),
  phone_number: z.string().nullable(),
  address_text: z.string().nullable(),
  city: z.string().nullable(),
  area: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  price_band: priceBandSchema.nullable(),
  average_rating: z.coerce.number().min(0).max(5),
  review_count: z.coerce.number().int().min(0),
  is_active: z.boolean(),
  is_open_override: z.boolean().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const vendorSummarySchema = vendorSchema.pick({
  id: true,
  name: true,
  slug: true,
  short_description: true,
  phone_number: true,
  area: true,
  latitude: true,
  longitude: true,
  price_band: true,
  average_rating: true,
  review_count: true,
  is_active: true,
  is_open_override: true,
});

export const vendorHoursSchema = z
  .object({
    id: uuidSchema,
    vendor_id: uuidSchema,
    day_of_week: dayOfWeekSchema,
    open_time: timeSchema.nullable(),
    close_time: timeSchema.nullable(),
    is_closed: z.boolean(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .refine(
    (hours) => hours.is_closed || (hours.open_time !== null && hours.close_time !== null),
    {
      message: "Open days require open_time and close_time.",
      path: ["open_time"],
    },
  );

export const vendorCategorySchema = z.object({
  id: uuidSchema,
  name: nonEmptyTextSchema,
  slug: slugSchema,
  created_at: timestampSchema,
});

export const vendorCategoryMapSchema = z.object({
  id: uuidSchema,
  vendor_id: uuidSchema,
  category_id: uuidSchema,
  created_at: timestampSchema,
});

export const vendorFeaturedDishSchema = z.object({
  id: uuidSchema,
  vendor_id: uuidSchema,
  dish_name: nonEmptyTextSchema,
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  is_featured: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const vendorImageSchema = z.object({
  id: uuidSchema,
  vendor_id: uuidSchema,
  image_url: nonEmptyTextSchema,
  storage_object_path: z.string().nullable().optional(),
  sort_order: z.coerce.number().int().min(0),
  created_at: timestampSchema,
});

export const ratingSchema = z.object({
  id: uuidSchema,
  vendor_id: uuidSchema,
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().nullable(),
  source_type: z.string().nullable(),
  created_at: timestampSchema,
});

export const ratingSummarySchema = z.object({
  average_rating: z.coerce.number().min(0).max(5),
  review_count: z.coerce.number().int().min(0),
});

export const adminUserSchema = z.object({
  id: uuidSchema,
  email: z.email(),
  full_name: z.string().nullable(),
  role: nonEmptyTextSchema,
  created_at: timestampSchema,
});

export const auditLogSchema = z.object({
  id: uuidSchema,
  admin_user_id: uuidSchema.nullable(),
  entity_type: nonEmptyTextSchema,
  entity_id: uuidSchema.nullable(),
  action: nonEmptyTextSchema,
  metadata: z.record(z.string(), z.unknown()),
  created_at: timestampSchema,
});

export const nearbyVendorsQuerySchema = z
  .object({
    lat: latitudeSchema.optional(),
    lng: longitudeSchema.optional(),
    location_source: locationSourceSchema.optional(),
    radius_km: z.coerce.number().positive().max(100).optional(),
    open_now: booleanLikeSchema.optional(),
    category: slugSchema.optional(),
    price_band: priceBandSchema.optional(),
    search: z.string().trim().max(120).optional(),
  })
  .superRefine((query, context) => {
    const hasLat = query.lat !== undefined;
    const hasLng = query.lng !== undefined;

    if (hasLat !== hasLng) {
      context.addIssue({
        code: "custom",
        message: "Both lat and lng are required when providing coordinates.",
        path: hasLat ? ["lng"] : ["lat"],
      });
    }

    if (query.location_source === "default_city" && (hasLat || hasLng)) {
      context.addIssue({
        code: "custom",
        message: "default_city location_source must not include lat or lng.",
        path: ["location_source"],
      });
    }
  });

export const vendorSlugParamsSchema = z.object({
  slug: slugSchema,
});

export const vendorIdParamsSchema = z.object({
  id: uuidSchema,
});

export const createVendorRequestSchema = z.object({
  name: nonEmptyTextSchema,
  slug: slugSchema,
  short_description: optionalTextSchema,
  phone_number: optionalTextSchema,
  address_text: optionalTextSchema,
  city: optionalTextSchema,
  area: optionalTextSchema,
  state: optionalTextSchema,
  country: optionalTextSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  price_band: priceBandSchema.nullable().optional(),
  is_active: z.boolean().default(true),
  is_open_override: z.boolean().nullable().optional(),
});

export const updateVendorRequestSchema = createVendorRequestSchema.partial();

export const adminVendorsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  area: z.string().trim().max(120).optional(),
  is_active: booleanLikeSchema.optional(),
  price_band: priceBandSchema.optional(),
});

export const replaceVendorHoursRequestSchema = z.object({
  hours: z
    .array(
      z
        .object({
          day_of_week: dayOfWeekSchema,
          open_time: timeSchema.nullable(),
          close_time: timeSchema.nullable(),
          is_closed: z.boolean().default(false),
        })
        .refine(
          (hours) =>
            hours.is_closed || (hours.open_time !== null && hours.close_time !== null),
          {
            message: "Open days require open_time and close_time.",
            path: ["open_time"],
          },
        ),
    )
    .length(7),
});

export const createVendorDishesRequestSchema = z.object({
  dishes: z.array(
    z.object({
      dish_name: nonEmptyTextSchema,
      description: optionalTextSchema,
      image_url: optionalTextSchema,
      is_featured: z.boolean().default(true),
    }),
  ).min(1),
});

export const vendorImageMetadataRequestSchema = z.object({
  images: z.array(
    z.object({
      image_url: nonEmptyTextSchema,
      sort_order: z.coerce.number().int().min(0).default(0),
    }),
  ).min(1),
});

export const auditLogsQuerySchema = paginationQuerySchema.extend({
  entity_type: z.string().trim().max(80).optional(),
  entity_id: uuidSchema.optional(),
});

export const vendorDetailResponseDataSchema = vendorSchema.extend({
  hours: z.array(vendorHoursSchema),
  categories: z.array(vendorCategorySchema),
  featured_dishes: z.array(vendorFeaturedDishSchema),
  images: z.array(vendorImageSchema),
  rating_summary: ratingSummarySchema,
});

export const nearbyVendorsResponseDataSchema = z.object({
  location: z.object({
    source: locationSourceSchema,
    label: z.string(),
    coordinates: z.object({
      lat: latitudeSchema,
      lng: longitudeSchema,
    }),
    isApproximate: z.boolean(),
  }),
  vendors: z.array(
    z.object({
      vendor_id: uuidSchema,
      name: nonEmptyTextSchema,
      slug: slugSchema,
      short_description: z.string().nullable(),
      phone_number: z.string().nullable(),
      area: z.string().nullable(),
      latitude: latitudeSchema,
      longitude: longitudeSchema,
      price_band: priceBandSchema.nullable(),
      average_rating: z.coerce.number().min(0).max(5),
      review_count: z.coerce.number().int().min(0),
      distance_km: z.number().min(0),
      is_open_now: z.boolean(),
    }),
  ),
});
