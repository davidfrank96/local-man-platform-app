import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateInput, validateJsonBody } from "@/lib/api/validation";
import { updateVendorRequestSchema, vendorIdParamsSchema } from "@/lib/validation";

type AdminVendorRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(_request: Request, { params }: AdminVendorRouteContext) {
  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(_request, updateVendorRequestSchema);

  if (!body.success) {
    return body.response;
  }

  return apiNotImplemented(apiEndpoints.updateVendor);
}

export async function DELETE(
  _request: Request,
  { params }: AdminVendorRouteContext,
) {
  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  return apiNotImplemented(apiEndpoints.deleteVendor);
}
