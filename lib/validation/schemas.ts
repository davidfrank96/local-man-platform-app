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

export const nearbyVendorCategorySummarySchema = z.object({
  name: z.string().nullable(),
  slug: slugSchema,
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
  anonymous_client_hash: z.string().nullable().optional(),
  created_at: timestampSchema,
});

export const ratingSummarySchema = z.object({
  average_rating: z.coerce.number().min(0).max(5),
  review_count: z.coerce.number().int().min(0),
});

export const riderVerificationStatusSchema = z.enum([
  "pending",
  "verified",
  "rejected",
]);

export const riderVisibilityStatusSchema = z.enum([
  "hidden",
  "visible",
  "suspended",
]);

export const riderDeliveryLocationModeSchema = z.enum([
  "current_location",
  "manual_address",
]);

export const riderPaymentNoteTypeSchema = z.enum([
  "coordinate_directly",
  "already_paid_vendor",
  "pay_vendor_on_pickup",
  "cash_on_delivery",
]);

export const riderUnavailableReasonSchema = z.enum([
  "no_response",
  "unavailable",
  "wrong_number",
  "unsafe",
  "other",
]);

const riderPhoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^\+?[0-9][0-9\s().-]{6,31}$/, "Use a valid phone number.");

const riderOperatingAreasSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(25);

const riderJsonObjectSchema = z.record(z.string(), z.unknown());

const optionalRiderTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const riderSchema = z.object({
  id: uuidSchema,
  display_name: nonEmptyTextSchema,
  full_name: z.string().nullable(),
  phone: riderPhoneSchema,
  whatsapp_phone: riderPhoneSchema,
  photo_url: z.string().nullable(),
  vehicle_type: z.string().nullable(),
  plate_number: z.string().nullable(),
  operating_areas: riderOperatingAreasSchema.default([]),
  usual_available_hours: riderJsonObjectSchema.nullable(),
  verification_status: riderVerificationStatusSchema,
  visibility_status: riderVisibilityStatusSchema,
  notes: z.string().nullable(),
  consent_accepted_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const riderContactIntentSchema = z.object({
  id: uuidSchema,
  vendor_id: uuidSchema,
  rider_id: uuidSchema,
  customer_phone_hash: z.string().nullable(),
  delivery_area: z.string().nullable(),
  location_mode: riderDeliveryLocationModeSchema.nullable(),
  payment_note_type: riderPaymentNoteTypeSchema.nullable(),
  disclaimer_accepted_at: timestampSchema,
  whatsapp_link_generated_at: timestampSchema,
  request_metadata: riderJsonObjectSchema.nullable(),
  created_at: timestampSchema,
});

export const riderUnavailableReportSchema = z.object({
  id: uuidSchema,
  rider_id: uuidSchema,
  vendor_id: uuidSchema.nullable(),
  reason: riderUnavailableReasonSchema,
  reporter_phone_hash: z.string().nullable(),
  created_at: timestampSchema,
});

export const publicRiderSuggestionSchema = z
  .object({
    rider_id: uuidSchema,
    display_name: nonEmptyTextSchema,
    photo_url: z.string().nullable(),
    vehicle_type: z.string().nullable(),
    operating_areas: riderOperatingAreasSchema,
    usual_availability_label: z.string().trim().min(1).max(120).nullable(),
  })
  .strict();

export const riderSuggestionsResponseDataSchema = z.object({
  vendor_slug: slugSchema,
  riders: z.array(publicRiderSuggestionSchema),
}).strict();

export const riderContactHandoffRequestSchema = z
  .object({
    riderId: uuidSchema,
    customerName: z.string().trim().min(1).max(80),
    customerPhone: riderPhoneSchema,
    deliveryLocationMode: riderDeliveryLocationModeSchema,
    deliveryAddress: optionalRiderTextSchema(240),
    deliveryArea: optionalRiderTextSchema(120),
    orderNote: optionalRiderTextSchema(500),
    paymentNoteType: riderPaymentNoteTypeSchema,
    disclaimerAccepted: z.literal(true),
  })
  .superRefine((request, context) => {
    const hasDeliveryAddress =
      typeof request.deliveryAddress === "string" && request.deliveryAddress.length > 0;
    const hasDeliveryArea =
      typeof request.deliveryArea === "string" && request.deliveryArea.length > 0;

    if (request.deliveryLocationMode === "manual_address" && !hasDeliveryAddress) {
      context.addIssue({
        code: "custom",
        message: "Manual delivery requests require a delivery address.",
        path: ["deliveryAddress"],
      });
    }

    if (!hasDeliveryAddress && !hasDeliveryArea) {
      context.addIssue({
        code: "custom",
        message: "Provide a delivery address or approximate delivery area.",
        path: ["deliveryArea"],
      });
    }
  });

export const riderContactHandoffResponseDataSchema = z.object({
  intent_id: uuidSchema,
  whatsapp_url: z.url(),
  rider: publicRiderSuggestionSchema,
}).strict();

export const riderUnavailableReportRequestSchema = z.object({
  riderId: uuidSchema,
  vendorId: uuidSchema.optional(),
  reason: riderUnavailableReasonSchema,
  reporterPhone: riderPhoneSchema.optional(),
});

export const riderUnavailableReportResponseDataSchema = z.object({
  received: z.literal(true),
  report_id: uuidSchema,
  message: nonEmptyTextSchema,
}).strict();

export const riderApplicationRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  fullName: z.string().trim().min(1).max(120),
  phone: riderPhoneSchema,
  whatsappPhone: riderPhoneSchema,
  vehicleType: z.string().trim().min(1).max(80),
  plateNumber: optionalRiderTextSchema(40),
  operatingAreas: riderOperatingAreasSchema.min(1),
  usualAvailableHours: z.string().trim().min(1).max(240),
  consentAccepted: z.literal(true),
  independentRiderDisclaimerAccepted: z.literal(true),
});

export const riderApplicationResponseDataSchema = z.object({
  received: z.literal(true),
  review_status: z.literal("pending_review"),
  verification_status: z.literal("pending"),
  visibility_status: z.literal("hidden"),
  message: nonEmptyTextSchema,
}).strict();

const adminRiderHoursInputSchema = z.union([
  riderJsonObjectSchema,
  z
    .string()
    .trim()
    .max(240)
    .transform((value) => (value.length > 0 ? { label: value } : null)),
  z.null(),
]);

export const adminRiderSchema = riderSchema.extend({
  contact_intent_count: z.coerce.number().int().min(0).nullable(),
  unavailable_report_count: z.coerce.number().int().min(0).nullable(),
});

export const adminRidersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  verification_status: riderVerificationStatusSchema.optional(),
  visibility_status: riderVisibilityStatusSchema.optional(),
});

export const createAdminRiderRequestSchema = z
  .object({
    display_name: z.string().trim().min(1).max(80),
    full_name: optionalRiderTextSchema(120),
    phone: riderPhoneSchema,
    whatsapp_phone: riderPhoneSchema,
    vehicle_type: optionalRiderTextSchema(80),
    plate_number: optionalRiderTextSchema(40),
    operating_areas: riderOperatingAreasSchema.min(1),
    usual_available_hours: adminRiderHoursInputSchema.optional(),
    verification_status: riderVerificationStatusSchema.optional(),
    visibility_status: riderVisibilityStatusSchema.optional(),
    notes: optionalRiderTextSchema(1000),
    consent_confirmed: z.literal(true),
    consent_accepted_at: timestampSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const verificationStatus = value.verification_status ?? "pending";
    const visibilityStatus = value.visibility_status ?? "hidden";

    if (visibilityStatus === "visible" && verificationStatus !== "verified") {
      context.addIssue({
        code: "custom",
        message: "Visible riders must be verified.",
        path: ["visibility_status"],
      });
    }
  });

export const updateAdminRiderRequestSchema = z
  .object({
    display_name: z.string().trim().min(1).max(80).optional(),
    full_name: optionalRiderTextSchema(120),
    phone: riderPhoneSchema.optional(),
    whatsapp_phone: riderPhoneSchema.optional(),
    vehicle_type: optionalRiderTextSchema(80),
    plate_number: optionalRiderTextSchema(40),
    operating_areas: riderOperatingAreasSchema.optional(),
    usual_available_hours: adminRiderHoursInputSchema.optional(),
    verification_status: riderVerificationStatusSchema.optional(),
    visibility_status: riderVisibilityStatusSchema.optional(),
    notes: optionalRiderTextSchema(1000),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one rider field must be provided.",
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
  "CREATE_RIDER",
  "UPDATE_RIDER",
  "UPDATE_RIDER_STATUS",
]);

export const auditEntityTypeSchema = z.enum(["vendor", "admin_user", "rider"]);

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

export const operationalEventLevelSchema = z.enum([
  "debug",
  "info",
  "warn",
  "error",
]);

export const operationalEventAreaSchema = z.string().trim().min(1).max(80);

export const operationalEventTimeWindowSchema = z.enum([
  "1h",
  "24h",
  "7d",
  "30d",
  "all",
]);

export const operationalEventSchema = z.object({
  id: uuidSchema,
  created_at: timestampSchema,
  level: operationalEventLevelSchema,
  area: operationalEventAreaSchema,
  event: nonEmptyTextSchema,
  message: z.string().nullable(),
  route: z.string().nullable(),
  method: z.string().nullable(),
  status: z.coerce.number().int().min(100).max(599).nullable(),
  duration_ms: z.coerce.number().int().min(0).nullable(),
  request_id: z.string().nullable(),
  actor_role: z.string().nullable(),
  actor_id: z.string().nullable(),
  vendor_id: z.string().nullable(),
  vendor_slug: z.string().nullable(),
  environment: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
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

export const adminAnalyticsRiderMetricsSchema = z.object({
  total: z.coerce.number().int().min(0).default(0),
  verified: z.coerce.number().int().min(0).default(0),
  pending: z.coerce.number().int().min(0).default(0),
  rejected: z.coerce.number().int().min(0).default(0),
  visible: z.coerce.number().int().min(0).default(0),
  hidden: z.coerce.number().int().min(0).default(0),
  suspended: z.coerce.number().int().min(0).default(0),
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
  rider_metrics: adminAnalyticsRiderMetricsSchema.default({
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    visible: 0,
    hidden: 0,
    suspended: 0,
  }),
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

export const adminOperationalLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  level: operationalEventLevelSchema.optional(),
  area: operationalEventAreaSchema.optional(),
  event: z.string().trim().min(1).max(120).optional(),
  route: z.string().trim().min(1).max(160).optional(),
  since: timestampSchema.optional(),
  time_window: operationalEventTimeWindowSchema.optional(),
});

export const vendorDetailResponseDataSchema = vendorSchema.extend({
  hours: z.array(vendorHoursSchema),
  categories: z.array(vendorCategorySchema),
  featured_dishes: z.array(vendorFeaturedDishSchema),
  images: z.array(vendorImageSchema),
  is_open_now: z.boolean(),
  today_hours: z.string(),
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
      categories: z.array(nearbyVendorCategorySummarySchema).optional(),
      today_hours: z.string(),
    }),
  ),
});
