import { LoginForm } from '@/components/features/auth-form';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { GridPattern } from '@/components/ui/grid-pattern';

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your ForesightCS command center.',
};

export default function LoginPage() {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden py-10 flex items-center justify-center">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <GridPattern />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.06),transparent_60%)]" />
      </div>
      <PageWrapper className="relative z-10 flex w-full items-center justify-center">
        <LoginForm />
      </PageWrapper>
    </div>
  );
}
