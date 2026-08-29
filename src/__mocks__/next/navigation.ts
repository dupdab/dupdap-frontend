const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
}));

const usePathname = jest.fn(() => '/dashboard');
const useSearchParams = jest.fn(() => new URLSearchParams());
const redirect = jest.fn();

module.exports = { useRouter, usePathname, useSearchParams, redirect };
