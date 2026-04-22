import Link from "next/link";

const adminAreas = [
  "Vendor CRUD",
  "Hours management",
  "Image uploads",
  "Category assignment",
  "Featured dishes",
  "Audit logging",
];

export default function AdminPage() {
  return (
    <main className="page-shell narrow-shell">
      <p className="eyebrow">Admin placeholder</p>
      <h1>Admin workspace</h1>
      <p className="page-intro">
        This route reserves the future admin-only workflows for managing
        Abuja vendor data. Authentication and write logic are intentionally not
        implemented in this base setup.
      </p>
      <ul className="check-list">
        {adminAreas.map((area) => (
          <li key={area}>{area}</li>
        ))}
      </ul>
      <Link className="button-secondary inline-link" href="/">
        Back home
      </Link>
    </main>
  );
}
