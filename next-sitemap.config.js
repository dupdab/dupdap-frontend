/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://dupdub.com',
  generateRobotsTxt: true,
  // Public pages (landing, /waitlist, /status, /changelog, /legal) are
  // discovered automatically; private areas are excluded below.
  exclude: ['/dashboard', '/dashboard/*', '/pay', '/pay/*', '/auth', '/auth/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/dashboard', '/pay', '/auth'] },
    ],
  },
};
