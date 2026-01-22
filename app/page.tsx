'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);

    // Auto-redirect after animation
    const timer = setTimeout(() => {
      const isReturningUser = localStorage.getItem('dabdub_user');
      const hasSeenOnboarding = localStorage.getItem('dabdub_onboarding_complete');
      
      if (isReturningUser) {
        router.push('/dashboard');
      } else if (!hasSeenOnboarding) {
        router.push('/onboarding');
      } else {
        router.push('/auth');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="splash-screen">
      <div className={`splash-content ${isVisible ? 'visible' : ''}`}>
        <Image
          src="/logo.png"
          alt="DabDub Logo"
          width={150}
          height={150}
          priority
          className="splash-logo"
        />
        <h1 className="splash-tagline" style={{ fontSize: '20px' }}>
          Seamless crypto payments, instant fiat settlements
        </h1>
      </div>
    </main>
  );
}
