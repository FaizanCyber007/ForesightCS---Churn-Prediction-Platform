import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Dashboard3DBackgroundLazy } from '@/components/features/dashboard-3d-background-lazy';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Dashboard3DBackgroundLazy />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
