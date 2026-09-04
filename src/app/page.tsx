import Hero from "@/components/home/Hero";
import SaleBanner from "@/components/home/SaleBanner";
import ReviewsSection from "@/components/home/ReviewsSection";
import BestsellersSection from "@/components/home/BestsellersSection";
import FormatSection from "@/components/home/FormatSection";
import GoalsSection from "@/components/home/GoalsSection";
import StackBuilder from "@/components/home/StackBuilder";
import ProofSection from "@/components/home/ProofSection";
import LogisticsSection from "@/components/home/LogisticsSection";
import FAQSection from "@/components/home/FAQSection";
import EmailCapture from "@/components/home/EmailCapture";
import { faqSchema } from "@/data/faq";

/**
 * Scroll order answers, in sequence:
 *   Can I trust you? -> What should I buy? -> How do I choose? -> Prove it.
 * This page stays a server component; every animated section is its own
 * client island.
 */
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Hero />
      <SaleBanner />
      <ReviewsSection />
      {/* Formats before products: a first-time visitor has to understand that
          the same compound comes three ways before a product grid means
          anything to them. */}
      <FormatSection />
      <BestsellersSection />
      <GoalsSection />
      <StackBuilder />
      <ProofSection />
      <LogisticsSection />
      <FAQSection />
      <EmailCapture />
    </>
  );
}
