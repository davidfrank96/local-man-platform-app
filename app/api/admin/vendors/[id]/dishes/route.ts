import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";
import { validateInput, validateJsonBody } from "@/lib/api/validation";
import {
  createVendorDishesRequestSchema,
  vendorIdParamsSchema,
} from "@/lib/validation";

type VendorDishesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: VendorDishesRouteContext) {
  const routeParams = validateInput(vendorIdParamsSchema, await params);

  if (!routeParams.success) {
    return routeParams.response;
  }

  const body = await validateJsonBody(_request, createVendorDishesRequestSchema);

  if (!body.success) {
    return body.response;
  }

  return apiNotImplemented(apiEndpoints.createVendorDishes);
}
