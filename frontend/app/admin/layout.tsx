import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Dashboard3DBackgroundLazy } from '@/components/features/dashboard-3d-background-lazy';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Dashboard3DBackgroundLazy />
      <DashboardShell sidebar={<AdminSidebar />} requireSuperuser>
        {children}
      </DashboardShell>
    </>
  );
}
