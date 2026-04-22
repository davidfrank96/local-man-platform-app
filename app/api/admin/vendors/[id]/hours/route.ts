import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateInput, validateJsonBody } from "@/lib/api/validation";
import {
  replaceVendorHoursRequestSchema,
  vendorIdParamsSchema,
} from "@/lib/validation";

type VendorHoursRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: VendorHoursRouteContext) {
  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(_request, replaceVendorHoursRequestSchema);

  if (!body.success) {
    return body.response;
  }

  return apiNotImplemented(apiEndpoints.replaceVendorHours);
}
