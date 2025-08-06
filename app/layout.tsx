import { initSupabase } from '@/lib/supabaseClient';

if (typeof window !== 'undefined') {
  initSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const metadata = {
  title: 'Menu Guard: Allergy Safe Dine',
  description: 'Your guide to allergy-safe dining.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}