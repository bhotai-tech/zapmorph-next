import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { uuidSchema } from '@/schemas';
import { StatusPoller } from './status-poller';

export const metadata: Metadata = { title: 'Payment status', robots: { index: false } };

export default async function CheckoutStatusPage(props: PageProps<'/checkout/status/[orderId]'>) {
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect('/login');

  const { orderId } = await props.params;
  if (!uuidSchema.safeParse(orderId).success) redirect('/pricing');

  // Ownership via RLS: unknown or foreign orders go back to pricing.
  const { data: order } = await supabase.from('orders').select('id').eq('id', orderId).maybeSingle();
  if (!order) redirect('/pricing');

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center sm:px-6 sm:py-24">
        <StatusPoller statusUrl={`/api/checkout/status/${orderId}`} />
      </main>
      <Footer />
    </>
  );
}
