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

export const adminVendorSummarySchema = vendorSummarySchema.extend({
  hours_count: z.coerce.number().int().min(0),
  images_count: z.coerce.number().int().min(0),
  featured_dishes_count: z.coerce.number().int().min(0),
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

export const nearbyVendorFeaturedDishSummarySchema = z.object({
  dish_name: nonEmptyTextSchema,
  description: z.string().nullable(),
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
  role: z.enum(["admin", "agent"]),
  created_at: timestampSchema,
});

export const auditActionTypeSchema = z.enum([
  "CREATE_VENDOR",
  "UPDATE_VENDOR",
  "UPDATE_VENDOR_STATUS",
  "DELETE_VENDOR",
  "UPDATE_VENDOR_HOURS",
  "CREATE_VENDOR_IMAGES",
  "UPLOAD_VENDOR_IMAGE",
  "DELETE_VENDOR_IMAGE",
  "CREATE_VENDOR_DISHES",
  "DELETE_VENDOR_DISH",
  "CREATE_ADMIN_USER",
  "UPDATE_ADMIN_USER",
  "DELETE_ADMIN_USER",
  "CHANGE_ADMIN_USER_ROLE",
]);

export const auditEntityTypeSchema = z.enum(["vendor", "admin_user"]);

export const auditLogActorSchema = z.object({
  id: uuidSchema,
  email: z.email(),
  full_name: z.string().nullable(),
  role: z.enum(["admin", "agent"]),
}).nullable();

export const auditLogSchema = z.object({
  id: uuidSchema,
  admin_user_id: uuidSchema.nullable(),
  user_role: z.enum(["admin", "agent"]),
  entity_type: auditEntityTypeSchema,
  entity_id: uuidSchema.nullable(),
  action: auditActionTypeSchema,
  metadata: z.record(z.string(), z.unknown()),
  created_at: timestampSchema,
  admin_user: auditLogActorSchema.optional(),
});

export const userActionEventNameSchema = z.enum([
  "session_started",
  "first_interaction",
  "last_interaction",
  "vendor_selected",
  "vendor_detail_opened",
  "call_clicked",
  "directions_clicked",
  "search_used",
  "filter_applied",
]);

export const analyticsEventTypeSchema = z.union([
  userActionEventNameSchema,
  z.literal("filters_applied"),
]);

export const deviceTypeSchema = z.enum([
  "mobile",
  "tablet",
  "desktop",
  "unknown",
]);

const userActionEventFiltersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
  openNow: z.boolean().optional(),
  priceBand: z.union([priceBandSchema, z.literal("")]).optional(),
  category: z.union([slugSchema, z.literal("")]).optional(),
});

const userActionEventMetadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export const userActionEventSchema = z.object({
  event_type: userActionEventNameSchema,
  session_id: uuidSchema.optional(),
  vendor_id: uuidSchema.optional(),
  timestamp: timestampSchema.optional(),
  device_type: deviceTypeSchema.default("unknown"),
  location_source: locationSourceSchema.nullable().optional(),
  vendor_slug: slugSchema.optional(),
  page_path: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((value) => value.startsWith("/"), {
      message: "page_path must start with '/'.",
    })
    .optional(),
  search_query: z.string().trim().max(120).optional(),
  filters: userActionEventFiltersSchema.default({}),
  metadata: userActionEventMetadataSchema.default({}),
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

export const createManagedVendorRequestSchema = createVendorRequestSchema.extend({
  category_slug: slugSchema,
});

export const updateVendorRequestSchema = createVendorRequestSchema.partial();

const vendorIntakeRawTextSchema = z.union([z.string(), z.number(), z.null()]).optional();

export const vendorIntakeRowInputSchema = z.object({
  row_number: z.coerce.number().int().positive().optional(),
  vendor_name: vendorIntakeRawTextSchema,
  slug: vendorIntakeRawTextSchema,
  category: vendorIntakeRawTextSchema,
  price_band: vendorIntakeRawTextSchema,
  is_active: vendorIntakeRawTextSchema,
  area: vendorIntakeRawTextSchema,
  city: vendorIntakeRawTextSchema,
  state: vendorIntakeRawTextSchema,
  country: vendorIntakeRawTextSchema,
  address: vendorIntakeRawTextSchema,
  latitude: vendorIntakeRawTextSchema,
  longitude: vendorIntakeRawTextSchema,
  phone: vendorIntakeRawTextSchema,
  description: vendorIntakeRawTextSchema,
  monday_open: vendorIntakeRawTextSchema,
  monday_close: vendorIntakeRawTextSchema,
  tuesday_open: vendorIntakeRawTextSchema,
  tuesday_close: vendorIntakeRawTextSchema,
  wednesday_open: vendorIntakeRawTextSchema,
  wednesday_close: vendorIntakeRawTextSchema,
  thursday_open: vendorIntakeRawTextSchema,
  thursday_close: vendorIntakeRawTextSchema,
  friday_open: vendorIntakeRawTextSchema,
  friday_close: vendorIntakeRawTextSchema,
  saturday_open: vendorIntakeRawTextSchema,
  saturday_close: vendorIntakeRawTextSchema,
  sunday_open: vendorIntakeRawTextSchema,
  sunday_close: vendorIntakeRawTextSchema,
  dish_1_name: vendorIntakeRawTextSchema,
  dish_1_description: vendorIntakeRawTextSchema,
  dish_1_image_url: vendorIntakeRawTextSchema,
  dish_2_name: vendorIntakeRawTextSchema,
  dish_2_description: vendorIntakeRawTextSchema,
  dish_2_image_url: vendorIntakeRawTextSchema,
  image_url_1: vendorIntakeRawTextSchema,
  image_sort_order_1: vendorIntakeRawTextSchema,
  image_url_2: vendorIntakeRawTextSchema,
  image_sort_order_2: vendorIntakeRawTextSchema,
});

export const vendorIntakeRequestSchema = z.object({
  action: z.enum(["preview", "upload"]),
  rows: z.array(vendorIntakeRowInputSchema).min(1).max(500),
});

export const adminVendorsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  area: z.string().trim().max(120).optional(),
  is_active: booleanLikeSchema.optional(),
  price_band: priceBandSchema.optional(),
});

export const adminAnalyticsRangeSchema = z.enum(["24h", "7d", "30d", "all"]).default("7d");

export const adminAnalyticsQuerySchema = z.object({
  range: adminAnalyticsRangeSchema.default("7d"),
});

export const createAdminUserRequestSchema = z.object({
  email: z.email(),
  password: z.string().trim().min(8).max(200),
  full_name: optionalTextSchema,
  role: z.enum(["admin", "agent"]),
});

export const updateAdminUserRequestSchema = z
  .object({
    full_name: optionalTextSchema.optional(),
    role: z.enum(["admin", "agent"]).optional(),
  })
  .refine((value) => value.full_name !== undefined || value.role !== undefined, {
    message: "At least one admin user field must be provided.",
  });

export const adminAnalyticsSummarySchema = z.object({
  total_sessions: z.coerce.number().int().min(0),
  total_events: z.coerce.number().int().min(0),
  vendor_selections: z.coerce.number().int().min(0),
  vendor_detail_opens: z.coerce.number().int().min(0),
  call_clicks: z.coerce.number().int().min(0),
  directions_clicks: z.coerce.number().int().min(0),
  searches_used: z.coerce.number().int().min(0),
  filters_applied: z.coerce.number().int().min(0),
});

export const adminAnalyticsVendorMetricSchema = z.object({
  vendor_id: uuidSchema.nullable(),
  vendor_name: z.string().nullable(),
  vendor_slug: slugSchema.nullable().optional(),
  count: z.coerce.number().int().min(0),
});

export const adminAnalyticsDropoffSchema = z.object({
  session_metrics_available: z.boolean(),
  sessions_without_meaningful_interaction: z.coerce.number().int().min(0).nullable(),
  sessions_with_search_without_vendor_click: z.coerce.number().int().min(0).nullable(),
  sessions_with_detail_without_action: z.coerce.number().int().min(0).nullable(),
});

export const adminAnalyticsRecentEventSchema = z.object({
  id: uuidSchema,
  event_type: analyticsEventTypeSchema,
  vendor_id: uuidSchema.nullable(),
  vendor_name: z.string().nullable(),
  vendor_slug: slugSchema.nullable().optional(),
  device_type: deviceTypeSchema,
  location_source: locationSourceSchema.nullable(),
  timestamp: timestampSchema,
});

export const adminAnalyticsResponseDataSchema = z.object({
  range: adminAnalyticsRangeSchema,
  summary: adminAnalyticsSummarySchema,
  vendor_performance: z.object({
    most_selected_vendors: z.array(adminAnalyticsVendorMetricSchema),
    most_viewed_vendor_details: z.array(adminAnalyticsVendorMetricSchema),
    most_call_clicks: z.array(adminAnalyticsVendorMetricSchema),
    most_directions_clicks: z.array(adminAnalyticsVendorMetricSchema),
  }),
  dropoff: adminAnalyticsDropoffSchema,
  recent_events: z.array(adminAnalyticsRecentEventSchema),
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
      storage_object_path: optionalTextSchema,
      sort_order: z.coerce.number().int().min(0).default(0),
    }),
  ).min(1),
});

export const createVendorRatingRequestSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
});

export const vendorRatingResponseDataSchema = z.object({
  vendor_id: uuidSchema,
  rating_summary: ratingSummarySchema,
});

export const auditLogsQuerySchema = paginationQuerySchema.extend({
  user_role: z.enum(["admin", "agent"]).optional(),
  action: auditActionTypeSchema.optional(),
  entity_type: auditEntityTypeSchema.optional(),
  entity_id: uuidSchema.optional(),
  since: timestampSchema.optional(),
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
      ranking_score: z.coerce.number().int().min(0),
      distance_km: z.number().min(0),
      is_open_now: z.boolean(),
      featured_dish: nearbyVendorFeaturedDishSummarySchema.nullable(),
      today_hours: z.string(),
    }),
  ),
});
