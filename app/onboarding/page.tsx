'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const slides = [
  {
    id: 1,
    title: 'Send Money Globally',
    description: 'Accept USDC across 7+ blockchain networks. Fast, secure, and borderless payments.',
    icon: '🌍'
  },
  {
    id: 2,
    title: 'Instant Settlements',
    description: 'Automatic crypto-to-fiat conversion with instant bank transfers. Get paid in your local currency.',
    icon: '⚡'
  },
  {
    id: 3,
    title: 'Secure & Simple',
    description: 'Enterprise-grade security meets simple QR code payments. No crypto knowledge required.',
    icon: '🔒'
  }
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = () => {
    localStorage.setItem('dabdub_onboarding_complete', 'true');
    router.push('/auth');
  };

  return (
    <main className="onboarding-screen">
      <button className="skip-button" onClick={handleSkip}>
        Skip
      </button>

      <div className="onboarding-content">
        <div className="slide-icon">{slides[currentSlide].icon}</div>
        
        <div className="slide-text">
          <h1 className="slide-title">{slides[currentSlide].title}</h1>
          <p className="slide-description">{slides[currentSlide].description}</p>
        </div>

        <div className="progress-dots">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>

        <button className="next-button" onClick={handleNext}>
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </main>
  );
}
