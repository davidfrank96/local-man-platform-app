import { notFound } from "next/navigation";
import { VendorDetail } from "../../../components/public/vendor-detail.tsx";
import { sanitizePublicReturnPath } from "../../../lib/public/navigation.ts";
import {
  fetchVendorDetailBySlugFromSupabase,
  getSupabaseRestConfig,
} from "../../../lib/vendors/supabase.ts";
import type { LocationSource } from "../../../types/index.ts";

type VendorDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
    location_source?: string;
  }>;
};

function parseLocationSource(value: string | undefined): LocationSource | null {
  return value === "precise" || value === "approximate" || value === "default_city"
    ? value
    : null;
}

export default async function VendorDetailPage({
  params,
  searchParams,
}: VendorDetailPageProps) {
  const { slug } = await params;
  const { returnTo, location_source } = await searchParams;
  const config = getSupabaseRestConfig();

  if (!config) {
    return (
      <main className="page-shell narrow-shell">
        <p className="eyebrow">Runtime setup</p>
        <h1>Vendor detail unavailable</h1>
        <p className="page-intro">
          Supabase public environment variables are required to load vendor data.
        </p>
      </main>
    );
  }

  let vendor;

  try {
    vendor = await fetchVendorDetailBySlugFromSupabase(slug, config);
  } catch {
    return (
      <main className="page-shell narrow-shell">
        <p className="eyebrow">Runtime setup</p>
        <h1>Vendor detail unavailable</h1>
        <p className="page-intro">
          Unable to load vendor detail. Check the runtime setup and try again.
        </p>
      </main>
    );
  }

  if (!vendor) {
    notFound();
  }

  return (
    <VendorDetail
      locationSource={parseLocationSource(location_source)}
      returnTo={sanitizePublicReturnPath(returnTo ?? null)}
      vendor={vendor}
    />
  );
}
