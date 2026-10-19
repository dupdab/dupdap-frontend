import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Zap, Shield, Globe, QrCode, Check, X } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';

// Lazy-load the hero illustration so it never contributes to LCP (#573).
const PaymentFlowIllustration = dynamic(
  () => import('@/components/PaymentFlowIllustration'),
  { ssr: false, loading: () => <div className="max-w-3xl mx-auto mt-16 h-[200px]" aria-hidden="true" /> },
);

export const metadata: Metadata = {
  title: 'DupDub — Accept Crypto, Receive Fiat Instantly',
  description:
    'DupDub bridges Web3 payments with traditional banking. Merchants receive NGN/USD settlements while customers pay with USDC on Stellar.',
  openGraph: {
    title: 'DupDub — Accept Crypto, Receive Fiat Instantly',
    description:
      'DupDub bridges Web3 payments with traditional banking. Merchants receive NGN/USD settlements while customers pay with USDC on Stellar.',
    images: ['/og-image.png'],
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'DupDub',
  description: 'Crypto-to-fiat settlement platform bridging Web3 payments with traditional banking.',
  url: 'https://dupdub.com',
};

const pricingTiers = [
  {
    name: 'Standard',
    rate: '1.5%',
    volume: 'Up to $10,000 / month',
    desc: 'For merchants getting started with crypto payments.',
    highlight: false,
  },
  {
    name: 'Growth',
    rate: '1.0%',
    volume: '$10,000 – $100,000 / month',
    desc: 'Lower fees as your payment volume scales.',
    highlight: true,
  },
  {
    name: 'Enterprise',
    rate: '0.5%',
    volume: 'Above $100,000 / month',
    desc: 'Custom settlement terms and dedicated support.',
    highlight: false,
  },
];

const comparisonRows = [
  { feature: 'Transaction fee', dupdub: 'From 0.5%', traditional: '2.9% + $0.30' },
  { feature: 'Settlement speed', dupdub: '~5 seconds', traditional: '1–3 business days' },
  { feature: 'Cross-border fees', dupdub: 'None', traditional: '2–4% + FX markup' },
  { feature: 'Chargebacks', dupdub: 'Not possible', traditional: 'Common, with fees' },
  { feature: 'Setup cost', dupdub: 'Free', traditional: 'Varies by provider' },
];

const faqs = [
  {
    q: 'How are the fees calculated?',
    a: 'Fees are a percentage of each settled payment. The standard rate is 1.5%, dropping to 1.0% and 0.5% as your monthly volume grows.',
  },
  {
    q: 'Are there any hidden or setup fees?',
    a: 'No. Creating an account is free and there are no monthly or setup fees. You only pay the per-transaction rate for your tier.',
  },
  {
    q: 'When do I get my money?',
    a: 'Stellar confirms payments in about 5 seconds. Fiat settlement to your bank account is triggered automatically after confirmation.',
  },
  {
    q: 'Which currencies can I settle in?',
    a: 'Merchants can settle in NGN or USD today, with more local currencies on the roadmap.',
  },
];

export default function LandingPage() {
  // Read the per-request CSP nonce set by middleware so the inline JSON-LD
  // script can be allowed without 'unsafe-inline' in script-src (#388).
  const nonce = headers().get('x-nonce') ?? undefined;

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-brand-200">
          <Zap className="w-4 h-4" />
          Powered by Stellar Network
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Accept crypto,<br />receive fiat — instantly
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          DupDub bridges Web3 payments with traditional banking. Merchants receive NGN/USD settlements
          while customers pay with USDC on Stellar.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register" className="btn-primary flex items-center gap-2 text-base px-6 py-3">
            Start accepting payments <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/waitlist" className="btn-secondary text-base px-6 py-3">
            Join waitlist
          </Link>
        </div>
        <PaymentFlowIllustration />
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Why DupDub?</h2>
          {/* ul/li gives screen readers "list of N items" grouping context (#155) */}
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
            {[
              {
                icon: QrCode,
                title: 'QR Code Payments',
                desc: 'Customers scan and pay with any Stellar wallet. No crypto knowledge needed for merchants.',
              },
              {
                icon: Zap,
                title: 'Instant Settlement',
                desc: 'Stellar confirms in ~5s. Fiat hits your bank account automatically.',
              },
              {
                icon: Shield,
                title: 'Non-Custodial',
                desc: 'Your keys, your funds. We monitor the blockchain, you hold the wallet.',
              },
              {
                icon: Globe,
                title: 'Cross-Border',
                desc: 'Accept global payments, settle in local currency. Perfect for emerging markets.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="card p-6">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">How it works</h2>
        <p className="text-gray-500 text-center mb-12">Three steps to your first settlement</p>
        {/* ul/li gives screen readers "list of N items" grouping context (#155) */}
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 list-none p-0 m-0">
          {[
            { step: '01', title: 'Create payment', desc: 'Enter amount in USD. We generate a QR code with your Stellar deposit address.' },
            { step: '02', title: 'Customer approves + deposits', desc: 'Customer scans QR, approves USDC allowance for escrow, then calls deposit from their Stellar wallet.' },
            { step: '03', title: 'Receive fiat', desc: 'We detect the payment, convert to fiat, and transfer to your bank account automatically.' },
          ].map(({ step, title, desc }) => (
            <li key={step} className="text-center">
              <div className="w-12 h-12 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-center mb-12">
            Pay only for what you settle. Fees drop automatically as your volume grows.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0 m-0">
            {pricingTiers.map(({ name, rate, volume, desc, highlight }) => (
              <li
                key={name}
                className={`card p-6 flex flex-col ${highlight ? 'ring-2 ring-brand-500' : ''}`}
              >
                <h3 className="font-semibold text-lg mb-1">{name}</h3>
                <p className="text-sm text-gray-500 mb-4">{desc}</p>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-gray-900">{rate}</span>
                  <span className="text-sm text-gray-500"> per transaction</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">{volume}</p>
                <Link
                  href="/auth/register"
                  className={`mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    highlight
                      ? 'bg-brand-500 text-white hover:bg-brand-600'
                      : 'bg-white text-brand-600 border border-brand-200 hover:bg-brand-50'
                  }`}
                >
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Comparison table */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-8">DupDub vs traditional processors</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="py-3 pr-4 font-semibold text-gray-900">Feature</th>
                    <th scope="col" className="py-3 px-4 font-semibold text-brand-600">DupDub</th>
                    <th scope="col" className="py-3 pl-4 font-semibold text-gray-900">Traditional processors</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(({ feature, dupdub, traditional }) => (
                    <tr key={feature} className="border-b border-gray-100">
                      <th scope="row" className="py-3 pr-4 font-medium text-gray-700">{feature}</th>
                      <td className="py-3 px-4 text-gray-900">
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-green-600" /> {dupdub}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <X className="w-4 h-4 text-gray-400" /> {traditional}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ accordion */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h3>
            <div className="space-y-3">
              {faqs.map(({ q, a }) => (
                <details key={q} className="card p-4 group">
                  <summary className="font-semibold cursor-pointer list-none flex items-center justify-between">
                    {q}
                    <ArrowRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="text-sm text-gray-500 mt-3">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Pricing CTA */}
          <div className="mt-16 text-center">
            <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
              Start accepting payments <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-500">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-brand-100 mb-8">Join merchants accepting crypto payments today</p>
          <Link href="/auth/register" className="bg-white text-brand-600 font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 transition-colors inline-flex items-center gap-2">
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} DupDub. Built with Stellar.
      </footer>
    </div>
  );
}
