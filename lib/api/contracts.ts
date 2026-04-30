export type ApiAccess = "public" | "admin";

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

export type AppErrorCode =
  | "CONFIGURATION_ERROR"
  | "CONFIG_ERROR"
  | "NOT_IMPLEMENTED"
  | "UPSTREAM_ERROR"
  | "AUTH_PROVIDER_ERROR"
  | "AUTH_ERROR"
  | "SESSION_ERROR"
  | "USER_ALREADY_EXISTS"
  | "INVALID_PASSWORD"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "UNKNOWN_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND";

export type AppErrorContract = {
  code: AppErrorCode;
  message: string;
  detail?: string;
  status?: number;
};

export type ApiEndpointContract = {
  access: ApiAccess;
  method: ApiMethod;
  path: string;
  requestShape: string;
  responseShape: string;
  validationBoundary: readonly string[];
};

export const apiEndpoints = {
  getNearbyVendors: {
    access: "public",
    method: "GET",
    path: "/api/vendors/nearby",
    requestShape:
      "Query params: lat, lng, radius_km, open_now, category, price_band, search.",
    responseShape:
      "Vendor list with vendor_id, name, coordinates, computed ranking_score, computed distance_km, is_open_now, one featured dish summary when available, and card fields.",
    validationBoundary: [
      "coordinates must be valid numbers",
      "radius_km must be a positive number when provided",
      "open_now must be boolean-like when provided",
      "category and price_band must map to supported values when provided",
      "search must be sanitized before querying",
      "usage-signal ranking must stay deterministic and server-side",
    ],
  },
  getVendorBySlug: {
    access: "public",
    method: "GET",
    path: "/api/vendors/[slug]",
    requestShape: "Route param: slug.",
    responseShape:
      "Vendor info with hours, categories, featured dishes, images, and rating summary.",
    validationBoundary: ["slug must match the documented slug format"],
  },
  createVendorRating: {
    access: "public",
    method: "POST",
    path: "/api/vendors/[slug]/ratings",
    requestShape: "Route param: slug. JSON body with score = 1 through 5.",
    responseShape: "Vendor id and updated rating summary for the rated vendor.",
    validationBoundary: [
      "slug must match the documented slug format",
      "score must be an integer from 1 through 5",
      "rating writes must remain lightweight and comment-free",
    ],
  },
  getCategories: {
    access: "public",
    method: "GET",
    path: "/api/categories",
    requestShape: "No request body or query params.",
    responseShape: "List of category names and slugs.",
    validationBoundary: ["no client input expected"],
  },
  trackUserAction: {
    access: "public",
    method: "POST",
    path: "/api/events",
    requestShape:
      "JSON body with event_type, session_id, optional vendor_id, device_type, location_source, and optional lightweight page/filter metadata.",
    responseShape: "Accepted event write acknowledgement.",
    validationBoundary: [
      "event_type must be one of the documented public action events",
      "session_id should be a client-generated UUID when provided",
      "vendor_id must be a valid UUID when provided",
      "device_type must be a supported lightweight client classification",
    ],
  },
  getAdminAnalytics: {
    access: "admin",
    method: "GET",
    path: "/api/admin/analytics",
    requestShape: "Optional query param: range = 24h | 7d | 30d | all.",
    responseShape:
      "Summary counts, vendor performance rankings, drop-off metrics, and recent usage events from user_events.",
    validationBoundary: [
      "admin authentication required",
      "range must be one of the documented analytics windows",
      "analytics reads must remain read-only",
      "historical rows without session_id must degrade safely",
    ],
  },
  createVendor: {
    access: "admin",
    method: "POST",
    path: "/api/admin/vendors",
    requestShape:
      "JSON body with vendor profile fields, category_slug, address, coordinates, price band, and active state.",
    responseShape: "Created vendor id, slug, and summary fields.",
    validationBoundary: [
      "admin authentication required",
      "required vendor fields must be present",
      "slug must be unique",
      "coordinates must be valid numbers",
      "phone number must be sanitized",
    ],
  },
  intakeVendors: {
    access: "admin",
    method: "POST",
    path: "/api/admin/vendors/intake",
    requestShape:
      "JSON body with action = preview | upload and rows containing the full vendor intake contract: vendor_name, optional slug, category, price_band, description, phone, address, area, city, state, country, latitude, longitude, optional is_active, daily open/close columns for all seven days, featured dish columns, and remote image URL columns.",
    responseShape:
      "Preview or upload result with row-by-row validation issues, valid rows, invalid rows, and uploaded vendor summaries when action = upload.",
    validationBoundary: [
      "admin authentication required",
      "rows must be validated before any upload begins",
      "category must map to a real vendor category",
      "coordinates must be valid when provided",
      "duplicate vendors within the batch and existing vendor set must be flagged before insert",
    ],
  },
  updateVendor: {
    access: "admin",
    method: "PUT",
    path: "/api/admin/vendors/[id]",
    requestShape:
      "Route param: id. JSON body with editable vendor profile fields.",
    responseShape: "Updated vendor id and summary fields.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
      "slug must remain unique when changed",
      "coordinates must be valid numbers when provided",
      "phone number must be sanitized when provided",
    ],
  },
  deleteVendor: {
    access: "admin",
    method: "DELETE",
    path: "/api/admin/vendors/[id]",
    requestShape: "Route param: id.",
    responseShape: "Deleted or soft-disabled vendor id.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
      "prefer soft-disable when preserving auditability is needed",
    ],
  },
  uploadVendorImages: {
    access: "admin",
    method: "POST",
    path: "/api/admin/vendors/[id]/images",
    requestShape:
      "GET and POST use route param id. POST accepts multipart form data for uploads, with JSON image metadata as a fallback. DELETE uses route params id and imageId.",
    responseShape: "Image records, upload results, or deleted image records.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
      "uploads must be restricted by type and size",
      "image records must belong to the target vendor",
    ],
  },
  replaceVendorHours: {
    access: "admin",
    method: "POST",
    path: "/api/admin/vendors/[id]/hours",
    requestShape: "Route param: id. JSON body with weekly vendor hours.",
    responseShape: "Saved weekly vendor hours.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
      "day_of_week must be 0 through 6",
      "hours must support closed days and overnight ranges",
    ],
  },
  getVendorHours: {
    access: "admin",
    method: "GET",
    path: "/api/admin/vendors/[id]/hours",
    requestShape: "Route param: id.",
    responseShape: "Current weekly vendor hours ordered by day_of_week.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
    ],
  },
  createVendorDishes: {
    access: "admin",
    method: "POST",
    path: "/api/admin/vendors/[id]/dishes",
    requestShape: "Route param: id. JSON body with featured dishes.",
    responseShape: "Created featured dish records.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
      "dish_name is required",
      "dish records must belong to the target vendor",
    ],
  },
  getVendorDishes: {
    access: "admin",
    method: "GET",
    path: "/api/admin/vendors/[id]/dishes",
    requestShape: "Route param: id.",
    responseShape: "Current featured dish records for the selected vendor.",
    validationBoundary: [
      "admin authentication required",
      "id must be a valid UUID",
      "dish records must belong to the target vendor",
    ],
  },
  getAuditLogs: {
    access: "admin",
    method: "GET",
    path: "/api/admin/audit-logs",
    requestShape:
      "Optional pagination plus user_role, action, entity_type, entity_id, and since filters.",
    responseShape: "Paginated audit log entries with actor details and lightweight metadata.",
    validationBoundary: [
      "admin authentication required",
      "pagination values must be bounded",
      "role and action filters must be supported enum values",
      "entity filters must be sanitized",
    ],
  },
} as const satisfies Record<string, ApiEndpointContract>;
