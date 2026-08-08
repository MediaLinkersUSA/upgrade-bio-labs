import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="container-site py-20">
      <div className="mx-auto max-w-[48ch] text-center">
        <h1 className="t-display-md">Accounts Are Moving</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">
          Order history still lives on the previous system while this storefront
          rolls out. For an order status or a copy of an invoice, email{" "}
          <a href={`mailto:${SITE.email}`} className="text-teal-dark hover:underline">
            {SITE.email}
          </a>{" "}
          and we will pull it up.
        </p>
        <Link href="/shop" className="btn-primary mt-8">
          Browse The Catalog
        </Link>
      </div>
    </div>
  );
}
