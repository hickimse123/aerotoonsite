const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yomitranslate.com';

// /seri sayfası /series ile aynı içerik — canonical /series'e işaret etmeli
export const metadata = {
  alternates: {
    canonical: `${BASE_URL}/series`,
  },
  robots: { index: false, follow: true },
};

export default function SeriListLayout({ children }) {
  return children;
}