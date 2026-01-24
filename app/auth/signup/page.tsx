'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkPasswordStrength = (password: string) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'strong';
    return 'medium';
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
      setPasswordStrength(checkPasswordStrength(value));
      if (value.length > 0 && value.length < 6) {
        setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
      } else {
        setErrors(prev => ({ ...prev, password: '' }));
      }
    }

    if (name === 'confirmPassword') {
      if (value && value !== formData.password) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
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
        setErrors(prev => ({ ...prev, email: data.message || 'Sign up failed' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, email: 'Something went wrong. Please try again.' }));
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
          <h1 className="form-title">Create Account</h1>
          <p className="form-subtitle">Sign up to get started</p>
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
              placeholder="Create a password"
              required
            />
            {passwordStrength && (
              <div className="password-strength">
                <div className={`strength-bar strength-${passwordStrength}`}>
                  <div className="strength-fill"></div>
                </div>
                <span className={`strength-text strength-${passwordStrength}`}>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </span>
              </div>
            )}
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
              required
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="form-footer">
          Already have an account?{' '}
          <button onClick={() => router.push('/auth/login')} className="link-btn">
            Log In
          </button>
        </p>
      </div>
    </main>
  );
}
