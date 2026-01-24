'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time validation
    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
      } else {
        setErrors(prev => ({ ...prev, email: '' }));
      }
    }

    if (name === 'password') {
      if (value.length > 0 && value.length < 6) {
        setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
      } else {
        setErrors(prev => ({ ...prev, password: '' }));
      }
    }

    // Clear general error when user starts typing
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.email || !formData.password) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('dabdub_user', JSON.stringify(data.user));
        router.push('/dashboard');
      } else {
        setErrors(prev => ({ ...prev, general: data.message || 'Login failed' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: 'Something went wrong. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // TODO: Implement Google OAuth
    console.log('Google auth clicked');
  };

  const handleMetaMaskAuth = () => {
    // TODO: Implement MetaMask auth
    console.log('MetaMask auth clicked');
  };

  return (
    <main className="auth-form-page">
      <div className="auth-form-container">
        <div className="auth-form-header">
          <button onClick={() => router.back()} className="back-button">
            ← Back
          </button>
          <h1 className="form-title">Welcome Back</h1>
          <p className="form-subtitle">Log in to your account</p>
        </div>

        <div className="social-auth-buttons">
          <button className="social-btn google-btn" onClick={handleGoogleAuth}>
            <span className="social-icon">G</span>
            Continue with Google
          </button>
          <button className="social-btn metamask-btn" onClick={handleMetaMaskAuth}>
            <span className="social-icon">🦊</span>
            Continue with MetaMask
          </button>
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        {errors.general && (
          <div className="general-error">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email"
              required
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your password"
              required
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button type="button" className="forgot-password" onClick={() => console.log('Forgot password')}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <p className="form-footer">
          Don't have an account?{' '}
          <button onClick={() => router.push('/auth/signup')} className="link-btn">
            Sign Up
          </button>
        </p>
      </div>
    </main>
  );
}
