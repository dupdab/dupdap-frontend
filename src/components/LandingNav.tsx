'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Main navigation" className="border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="font-bold text-xl text-brand-600">DupDub</span>

        <div className="hidden sm:flex items-center gap-4">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
            Login
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="sm:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900"
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label="Toggle menu"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open ? (
        <div
          id="landing-mobile-menu"
          className="sm:hidden border-t border-gray-100 px-6 py-4 space-y-3"
        >
          <Link
            href="/auth/login"
            className="block text-sm text-gray-600 hover:text-gray-900 py-2"
            onClick={() => setOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="btn-primary text-sm inline-block"
            onClick={() => setOpen(false)}
          >
            Get Started
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
