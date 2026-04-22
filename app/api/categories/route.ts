import { apiEndpoints } from "@/lib/api/contracts";
import { apiNotImplemented } from "@/lib/api/responses";

export function GET() {
  return apiNotImplemented(apiEndpoints.getCategories);
}
