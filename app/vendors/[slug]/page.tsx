import { notFound } from "next/navigation";
import { VendorDetail } from "../../../components/public/vendor-detail.tsx";
import {
  fetchVendorDetailBySlugFromSupabase,
  getSupabaseRestConfig,
} from "../../../lib/vendors/supabase.ts";

type VendorDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function VendorDetailPage({
  params,
}: VendorDetailPageProps) {
  const { slug } = await params;
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

  return <VendorDetail vendor={vendor} />;
}
