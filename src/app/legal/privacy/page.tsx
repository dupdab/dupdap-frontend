import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for our service, including GDPR compliance information.",
};

const LAST_UPDATED = "January 1, 2025";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-6">
        <section>
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="mt-2">
            This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our service. Please read it
            carefully. By using the service, you agree to the collection and use
            of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Information We Collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Account information:</strong> name, email address, and
              authentication credentials you provide when registering.
            </li>
            <li>
              <strong>Usage data:</strong> information about how you access and
              use the service, such as pages visited and actions taken.
            </li>
            <li>
              <strong>Technical data:</strong> IP address, browser type, device
              information, and cookies.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
          <p className="mt-2">
            We use the information we collect to provide, maintain, and improve
            the service, to communicate with you, to ensure security, and to
            comply with legal obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Sharing Your Information</h2>
          <p className="mt-2">
            We do not sell your personal information. We may share information
            with service providers who assist us in operating the service, when
            required by law, or to protect our rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Data Retention</h2>
          <p className="mt-2">
            We retain personal information only for as long as necessary to
            fulfill the purposes described in this policy, unless a longer
            retention period is required or permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Your Rights (GDPR)</h2>
          <p className="mt-2">
            If you are located in the European Economic Area (EEA), the United
            Kingdom, or Switzerland, you have rights under the General Data
            Protection Regulation (GDPR) regarding your personal data:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Right of access:</strong> request a copy of the personal
              data we hold about you.
            </li>
            <li>
              <strong>Right to rectification:</strong> request correction of
              inaccurate or incomplete data.
            </li>
            <li>
              <strong>Right to erasure:</strong> request deletion of your
              personal data.
            </li>
            <li>
              <strong>Right to restrict processing:</strong> request that we
              limit how we use your data.
            </li>
            <li>
              <strong>Right to data portability:</strong> request a copy of your
              data in a structured, machine-readable format.
            </li>
            <li>
              <strong>Right to object:</strong> object to our processing of your
              personal data.
            </li>
            <li>
              <strong>Right to withdraw consent:</strong> withdraw consent at
              any time where processing is based on consent.
            </li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact us. You also have
            the right to lodge a complaint with your local data protection
            authority.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Cookies</h2>
          <p className="mt-2">
            We use cookies and similar technologies to operate the service and
            understand usage. You can control cookies through your browser
            settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. We will post the
            updated version on this page and update the &quot;Last updated&quot;
            date above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Contact Us</h2>
          <p className="mt-2">
            If you have questions about this Privacy Policy, please contact us.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t pt-6 text-sm">
        <Link href="/legal/terms" className="underline underline-offset-4">
          Terms of Service
        </Link>
      </div>
    </main>
  );
}
