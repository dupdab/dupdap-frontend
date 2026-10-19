'use client';

import Link from 'next/link';
import { Shield, Banknote, ArrowRight } from 'lucide-react';

const adminTools = [
  {
    href: '/dashboard/admin/settlements',
    icon: Banknote,
    title: 'Settlements',
    description:
      'Review, approve, and retry merchant settlements. Filter by status, date, or merchant ID.',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Shield className="w-7 h-7 text-brand-600 shrink-0" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Internal tools for managing the DupDub platform.
          </p>
        </div>
      </div>

      {/* Tool cards */}
      <ul className="grid gap-4 sm:grid-cols-2" role="list">
        {adminTools.map(({ href, icon: Icon, title, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-brand-400 hover:shadow-md transition-all"
            >
              <span className="mt-0.5 flex-shrink-0 rounded-lg bg-brand-50 p-2 text-brand-600 group-hover:bg-brand-100 transition-colors">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{title}</p>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 shrink-0 self-center transition-colors" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
