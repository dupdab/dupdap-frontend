import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service — DupDub',
  description: 'The terms governing your use of the DupDub crypto-to-fiat settlement platform.',
};

const LAST_UPDATED = 'January 1, 2025';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DupDub (the &quot;Service&quot;), you agree to be bound by these Terms of
              Service. If you do not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Description of Service</h2>
            <p>
              DupDub is a crypto-to-fiat settlement platform that enables merchants to accept USDC payments on
              the Stellar network and receive settlement in local fiat currency. DupDub is non-custodial and does
              not hold your private keys or funds.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Eligibility</h2>
            <p>
              You must be at least 18 years old and legally capable of entering into binding contracts to use the
              Service. You are responsible for complying with all applicable laws in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Merchant Responsibilities</h2>
            <p>
              You are solely responsible for the accuracy of the payment information you provide, for maintaining
              the security of your wallet and account credentials, and for any taxes arising from your use of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Prohibited Activities</h2>
            <p>
              You may not use the Service for unlawful purposes, including money laundering, fraud, or the sale of
              prohibited goods and services. We reserve the right to suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, DupDub shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service, including losses related to blockchain
              transactions or third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes take effect
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Contact</h2>
            <p>
              Questions about these Terms may be directed to{' '}
              <a href="mailto:legal@dupdub.com" className="text-brand-600 hover:underline">legal@dupdub.com</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 text-sm text-gray-400">
          <Link href="/legal/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
