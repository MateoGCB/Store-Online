import type { Metadata } from 'next';
import { StatsView } from '@/components/admin/stats-view';

export const metadata: Metadata = { title: 'Resumen' };

export default function AdminHomePage() {
  return <StatsView />;
}
