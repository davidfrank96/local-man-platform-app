import Link from "next/link";
import { RiderApplicationForm } from "../../../components/public/rider-application-form.tsx";

export const metadata = {
  title: "Apply as an independent rider | local man",
  description:
    "Apply to be listed as an independent rider for Localman rider connection features.",
};

export default function RiderApplicationPage() {
  return (
    <main className="page-shell narrow-shell">
      <Link className="inline-link button-secondary" href="/">
        Back to local man
      </Link>

      <section className="vendor-detail-section">
        <p className="eyebrow">Rider Connect</p>
        <h1>Apply to be listed as an independent rider on Localman.</h1>
        <p className="page-intro">
          Share your rider profile details so Localman can review them for rider
          connection features.
        </p>
        <p>
          Riders are independent. Localman does not employ riders. Localman does
          not guarantee delivery jobs. Localman does not collect or process
          delivery payments. Localman does not guarantee delivery outcomes. Admin
          may review rider details before making a rider visible.
        </p>
      </section>

      <section className="vendor-detail-section">
        <h2>Rider application</h2>
        <p>
          Do not submit bank account, wallet, BVN, NIN, password, delivery fee,
          or live location information. Photo upload is not part of this phase.
        </p>
        <RiderApplicationForm />
      </section>
    </main>
  );
}
