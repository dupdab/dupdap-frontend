const isProduction = process.env.NODE_ENV === 'production';

/** Environment variables required for production builds (#803). */
const REQUIRED_ENV_VARS = ['NEXT_PUBLIC_API_URL'];

if (isProduction) {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(
      `\nBuild failed: missing required environment variable(s): ${missing.join(', ')}.\n` +
        'NEXT_PUBLIC_API_URL is required for production builds.\n' +
        'Set it in your environment or .env.production before running `next build`.\n'
    );
    process.exit(1);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  let parsedApiUrl;
  try {
    parsedApiUrl = new URL(apiUrl);
  } catch {
    console.error(
      '\nBuild failed: NEXT_PUBLIC_API_URL must be a valid HTTPS URL.\n'
    );
    process.exit(1);
  }

  if (parsedApiUrl.protocol !== 'https:') {
    console.error('\nBuild failed: NEXT_PUBLIC_API_URL must use HTTPS.\n');
    process.exit(1);
  }
}
