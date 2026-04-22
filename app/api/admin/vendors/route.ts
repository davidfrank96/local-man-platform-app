import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateJsonBody } from "@/lib/api/validation";
import { createVendorRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await validateJsonBody(request, createVendorRequestSchema);

  if (!body.success) {
    return body.response;
  }

  return apiNotImplemented(apiEndpoints.createVendor);
}
