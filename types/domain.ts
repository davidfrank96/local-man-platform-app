import type { z } from "zod";
import type {
  adminUserSchema,
  adminVendorsQuerySchema,
  auditLogSchema,
  createVendorDishesRequestSchema,
  createVendorRequestSchema,
  locationSourceSchema,
  nearbyVendorsQuerySchema,
  nearbyVendorsResponseDataSchema,
  ratingSchema,
  ratingSummarySchema,
  replaceVendorHoursRequestSchema,
  updateVendorRequestSchema,
  vendorCategorySchema,
  vendorCategoryMapSchema,
  vendorDetailResponseDataSchema,
  vendorFeaturedDishSchema,
  vendorHoursSchema,
  vendorIdParamsSchema,
  vendorImageMetadataRequestSchema,
  vendorImageSchema,
  vendorSchema,
  vendorSlugParamsSchema,
} from "@/lib/validation/schemas";
import type { priceBandSchema } from "@/lib/validation/common";

export type PriceBand = z.infer<typeof priceBandSchema>;
export type LocationSource = z.infer<typeof locationSourceSchema>;

export type Vendor = z.infer<typeof vendorSchema>;
export type VendorHours = z.infer<typeof vendorHoursSchema>;
export type VendorCategory = z.infer<typeof vendorCategorySchema>;
export type VendorCategoryMap = z.infer<typeof vendorCategoryMapSchema>;
export type VendorFeaturedDish = z.infer<typeof vendorFeaturedDishSchema>;
export type VendorImage = z.infer<typeof vendorImageSchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type RatingSummary = z.infer<typeof ratingSummarySchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;

export type NearbyVendorsQuery = z.infer<typeof nearbyVendorsQuerySchema>;
export type AdminVendorsQuery = z.infer<typeof adminVendorsQuerySchema>;
export type VendorSlugParams = z.infer<typeof vendorSlugParamsSchema>;
export type VendorIdParams = z.infer<typeof vendorIdParamsSchema>;
export type CreateVendorRequest = z.infer<typeof createVendorRequestSchema>;
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
