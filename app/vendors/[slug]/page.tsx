import Link from "next/link";

type VendorDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function VendorDetailPage({
  params,
}: VendorDetailPageProps) {
  const { slug } = await params;
  const vendorName = slug.replaceAll("-", " ");

  return (
    <main className="page-shell narrow-shell">
      <p className="eyebrow">Vendor placeholder</p>
      <h1>{vendorName}</h1>
      <p className="page-intro">
        This route reserves the future vendor detail page with hero imagery,
        open state, weekly hours, featured dishes, calls, and directions.
      </p>
      <div className="placeholder-panel">
        <span>Vendor slug</span>
        <strong>{slug}</strong>
      </div>
      <Link className="button-secondary inline-link" href="/">
        Back home
      </Link>
    </main>
  );
}
