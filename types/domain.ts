import type { z } from "zod";
import type {
  adminUserSchema,
  adminRiderSchema,
  adminRidersQuerySchema,
  adminAnalyticsQuerySchema,
  adminAnalyticsRangeSchema,
  adminAnalyticsResponseDataSchema,
  adminAnalyticsRiderMetricsSchema,
  adminAnalyticsRecentEventSchema,
  adminAnalyticsSummarySchema,
  adminAnalyticsVendorMetricSchema,
  adminAnalyticsDropoffSchema,
  adminOperationalLogsQuerySchema,
  auditActionTypeSchema,
  auditEntityTypeSchema,
  adminVendorsQuerySchema,
  auditLogSchema,
  createVendorDishesRequestSchema,
  createManagedVendorRequestSchema,
  createVendorRatingRequestSchema,
  createVendorRequestSchema,
  deviceTypeSchema,
  locationSourceSchema,
  nearbyVendorsQuerySchema,
  nearbyVendorsResponseDataSchema,
  ratingSchema,
  ratingSummarySchema,
  replaceVendorHoursRequestSchema,
  publicRiderSuggestionSchema,
  riderApplicationRequestSchema,
  riderApplicationResponseDataSchema,
  createAdminRiderRequestSchema,
  updateVendorRequestSchema,
  updateAdminRiderRequestSchema,
  riderContactHandoffRequestSchema,
  riderContactHandoffResponseDataSchema,
  riderContactIntentSchema,
  riderDeliveryLocationModeSchema,
  riderPaymentNoteTypeSchema,
  riderSchema,
  riderSuggestionsResponseDataSchema,
  riderUnavailableReasonSchema,
  riderUnavailableReportRequestSchema,
  riderUnavailableReportResponseDataSchema,
  riderUnavailableReportSchema,
  riderVerificationStatusSchema,
  riderVisibilityStatusSchema,
  userActionEventNameSchema,
  userActionEventSchema,
  operationalEventAreaSchema,
  operationalEventLevelSchema,
  operationalEventSchema,
  operationalEventTimeWindowSchema,
  vendorCategorySchema,
  vendorCategoryMapSchema,
  vendorDetailResponseDataSchema,
  vendorFeaturedDishSchema,
  vendorHoursSchema,
  vendorIdParamsSchema,
  vendorImageMetadataRequestSchema,
  vendorImageSchema,
  vendorRatingResponseDataSchema,
  vendorSchema,
  vendorSlugParamsSchema,
} from "@/lib/validation/schemas";
import type { priceBandSchema } from "@/lib/validation/common";

export type PriceBand = z.infer<typeof priceBandSchema>;
export type LocationSource = z.infer<typeof locationSourceSchema>;
export type DeviceType = z.infer<typeof deviceTypeSchema>;

export type Vendor = z.infer<typeof vendorSchema>;
export type VendorHours = z.infer<typeof vendorHoursSchema>;
export type VendorCategory = z.infer<typeof vendorCategorySchema>;
export type VendorCategoryMap = z.infer<typeof vendorCategoryMapSchema>;
export type VendorFeaturedDish = z.infer<typeof vendorFeaturedDishSchema>;
export type VendorImage = z.infer<typeof vendorImageSchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type RatingSummary = z.infer<typeof ratingSummarySchema>;
export type Rider = z.infer<typeof riderSchema>;
export type RiderVerificationStatus = z.infer<typeof riderVerificationStatusSchema>;
export type RiderVisibilityStatus = z.infer<typeof riderVisibilityStatusSchema>;
export type RiderDeliveryLocationMode = z.infer<typeof riderDeliveryLocationModeSchema>;
export type RiderPaymentNoteType = z.infer<typeof riderPaymentNoteTypeSchema>;
export type RiderUnavailableReason = z.infer<typeof riderUnavailableReasonSchema>;
export type RiderContactIntent = z.infer<typeof riderContactIntentSchema>;
export type RiderUnavailableReport = z.infer<typeof riderUnavailableReportSchema>;
export type PublicRiderSuggestion = z.infer<typeof publicRiderSuggestionSchema>;
export type RiderSuggestionsResponseData = z.infer<typeof riderSuggestionsResponseDataSchema>;
export type RiderContactHandoffRequest = z.infer<typeof riderContactHandoffRequestSchema>;
export type RiderContactHandoffResponseData = z.infer<
  typeof riderContactHandoffResponseDataSchema
>;
export type RiderUnavailableReportRequest = z.infer<
  typeof riderUnavailableReportRequestSchema
>;
export type RiderUnavailableReportResponseData = z.infer<
  typeof riderUnavailableReportResponseDataSchema
>;
export type RiderApplicationRequest = z.infer<typeof riderApplicationRequestSchema>;
export type RiderApplicationResponseData = z.infer<
  typeof riderApplicationResponseDataSchema
>;
export type AdminRider = z.infer<typeof adminRiderSchema>;
export type AdminRidersQuery = z.infer<typeof adminRidersQuerySchema>;
export type CreateAdminRiderRequest = z.infer<typeof createAdminRiderRequestSchema>;
export type UpdateAdminRiderRequest = z.infer<typeof updateAdminRiderRequestSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AdminRole = AdminUser["role"];
export type AuditActionType = z.infer<typeof auditActionTypeSchema>;
export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type OperationalEventLevel = z.infer<typeof operationalEventLevelSchema>;
export type OperationalEventArea = z.infer<typeof operationalEventAreaSchema>;
export type OperationalEventTimeWindow = z.infer<typeof operationalEventTimeWindowSchema>;
export type OperationalEvent = z.infer<typeof operationalEventSchema>;
export type UserActionEventName = z.infer<typeof userActionEventNameSchema>;
export type UserActionEvent = z.infer<typeof userActionEventSchema>;
export type AdminAnalyticsRange = z.infer<typeof adminAnalyticsRangeSchema>;
export type AdminAnalyticsQuery = z.infer<typeof adminAnalyticsQuerySchema>;
export type AdminOperationalLogsQuery = z.infer<typeof adminOperationalLogsQuerySchema>;
export type AdminAnalyticsSummary = z.infer<typeof adminAnalyticsSummarySchema>;
export type AdminAnalyticsVendorMetric = z.infer<typeof adminAnalyticsVendorMetricSchema>;
export type AdminAnalyticsDropoff = z.infer<typeof adminAnalyticsDropoffSchema>;
export type AdminAnalyticsRiderMetrics = z.infer<typeof adminAnalyticsRiderMetricsSchema>;
export type AdminAnalyticsRecentEvent = z.infer<typeof adminAnalyticsRecentEventSchema>;
export type AdminAnalyticsResponseData = z.infer<typeof adminAnalyticsResponseDataSchema>;

export type NearbyVendorsQuery = z.infer<typeof nearbyVendorsQuerySchema>;
export type AdminVendorsQuery = z.infer<typeof adminVendorsQuerySchema>;
export type VendorSlugParams = z.infer<typeof vendorSlugParamsSchema>;
export type VendorIdParams = z.infer<typeof vendorIdParamsSchema>;
export type CreateVendorRequest = z.infer<typeof createVendorRequestSchema>;
export type CreateManagedVendorRequest = z.infer<typeof createManagedVendorRequestSchema>;
export type CreateVendorRatingRequest = z.infer<typeof createVendorRatingRequestSchema>;
export type UpdateVendorRequest = z.infer<typeof updateVendorRequestSchema>;
export type ReplaceVendorHoursRequest = z.infer<
  typeof replaceVendorHoursRequestSchema
>;
export type CreateVendorDishesRequest = z.infer<
  typeof createVendorDishesRequestSchema
>;
export type VendorImageMetadataRequest = z.infer<
  typeof vendorImageMetadataRequestSchema
>;
export type VendorDetailResponseData = z.infer<
  typeof vendorDetailResponseDataSchema
>;
export type NearbyVendorsResponseData = z.infer<
  typeof nearbyVendorsResponseDataSchema
>;
export type VendorRatingResponseData = z.infer<
  typeof vendorRatingResponseDataSchema
>;
