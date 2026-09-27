const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error(
      '\nBuild failed: NEXT_PUBLIC_API_URL is required for production builds.\n' +
        'Set it in your environment or .env.production before running `next build`.\n',
    );
    process.exit(1);
  }

  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiUrl);
  } catch {
    console.error('\nBuild failed: NEXT_PUBLIC_API_URL must be a valid HTTP or HTTPS URL.\n');
    process.exit(1);
  }

  if (parsedApiUrl.protocol !== 'http:' && parsedApiUrl.protocol !== 'https:') {
    console.error('\nBuild failed: NEXT_PUBLIC_API_URL must be a valid HTTP or HTTPS URL.\n');
    process.exit(1);
  }
}
