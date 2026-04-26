export type ApiAccess = "public" | "admin";

export type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

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
      "Vendor list with vendor_id, name, coordinates, computed distance_km, is_open_now, one featured dish summary when available, and card fields.",
    validationBoundary: [
      "coordinates must be valid numbers",
      "radius_km must be a positive number when provided",
      "open_now must be boolean-like when provided",
      "category and price_band must map to supported values when provided",
      "search must be sanitized before querying",
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
  getCategories: {
    access: "public",
    method: "GET",
    path: "/api/categories",
    requestShape: "No request body or query params.",
    responseShape: "List of category names and slugs.",
    validationBoundary: ["no client input expected"],
  },
  createVendor: {
    access: "admin",
    method: "POST",
    path: "/api/admin/vendors",
    requestShape:
      "JSON body with vendor profile fields, address, coordinates, price band, and active state.",
    responseShape: "Created vendor id, slug, and summary fields.",
    validationBoundary: [
      "admin authentication required",
      "required vendor fields must be present",
      "slug must be unique",
      "coordinates must be valid numbers",
      "phone number must be sanitized",
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
    requestShape: "Optional pagination and entity filters.",
    responseShape: "Audit log entries.",
    validationBoundary: [
      "admin authentication required",
      "pagination values must be bounded",
      "entity filters must be sanitized",
    ],
  },
} as const satisfies Record<string, ApiEndpointContract>;
