import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateInput } from "@/lib/api/validation";
import { vendorSlugParamsSchema } from "@/lib/validation";

type VendorRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: VendorRouteContext) {
  const routeParams = validateInput(vendorSlugParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  return apiNotImplemented(apiEndpoints.getVendorBySlug);
}
