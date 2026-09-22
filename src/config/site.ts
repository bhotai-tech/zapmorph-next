/** Brand settings — rename the product here. Client-safe (no secrets). */
export const siteConfig = {
  // Camel case, no space: keeps one coined word (matching zapmorph.com) while
  // letting "Zap" and "Morph" read apart at small sizes.
  name: 'ZapMorph',
  tagline: 'Convert any file, right in your browser',
  description:
    'Free online file converters for images, PDFs, spreadsheets, data, audio and video. Files are converted on your device and never uploaded.',
  // Override per environment with NEXT_PUBLIC_APP_URL (localhost in dev).
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://zapmorph.com',
  supportEmail: 'support@zapmorph.com',
} as const;
