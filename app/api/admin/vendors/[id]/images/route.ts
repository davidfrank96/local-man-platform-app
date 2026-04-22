import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateInput, validateJsonBody } from "@/lib/api/validation";
import {
  vendorIdParamsSchema,
  vendorImageMetadataRequestSchema,
} from "@/lib/validation";

type VendorImagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: VendorImagesRouteContext) {
  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  if (_request.headers.get("content-type")?.includes("application/json")) {
    const body = await validateJsonBody(_request, vendorImageMetadataRequestSchema);

    if (!body.success) {
      return body.response;
    }
  }

  return apiNotImplemented(apiEndpoints.uploadVendorImages);
}
