import Link from 'next/link';
import { loadReport } from '@/lib/reports';
import ReportClient from '@/components/ReportClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Divergence Report · Prism India' };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadReport(id);
  if (!report) {
    return (
      <main className="mx-auto max-w-xl p-10 text-center">
        <h1 className="font-display text-2xl font-bold">Report not found</h1>
        <p className="mt-2 text-sm text-mute">Reports are stored on the server that created them and may have expired.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-cyan px-5 py-2 text-sm font-bold text-black">Back to the observatory</Link>
      </main>
    );
  }
  return <ReportClient report={report} id={id} />;
}
