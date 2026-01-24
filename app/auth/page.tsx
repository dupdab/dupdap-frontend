'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AuthPage() {
  const router = useRouter();

  return (
    <main className="auth-landing">
      <div className="auth-content">
        <div className="auth-logo-container">
          <Image
            src="/logo.png"
            alt="DabDub Logo"
            width={300}
            height={300}
            priority
            className="auth-logo"
          />
        </div>

        <div className="auth-text">
          <h1 className="auth-title">Cheese makes Naira easy</h1>
          <p className="auth-description">
            Create your wallet in seconds to save, send, or cash out dollars fast.
          </p>
        </div>

        <div className="auth-buttons">
          <button 
            className="btn-signup"
            onClick={() => router.push('/auth/signup')}
          >
            Sign Up
          </button>
          <button 
            className="btn-login"
            onClick={() => router.push('/auth/login')}
          >
            Log In
          </button>
        </div>

        <button className="btn-recover">
          Need to recover your Cheese wallet?
        </button>
      </div>
    </main>
  );
}
