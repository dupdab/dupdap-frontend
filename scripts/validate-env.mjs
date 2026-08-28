const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  console.error(
    '\nBuild failed: NEXT_PUBLIC_API_URL is required for production builds.\n' +
      'Set it in your environment or .env.production before running `next build`.\n',
  );
  process.exit(1);
}
