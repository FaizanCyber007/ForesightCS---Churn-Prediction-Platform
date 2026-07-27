import { Footer } from '@/components/layout/footer';
import { Navbar } from '@/components/layout/navbar';
import { GridPattern } from '@/components/ui/grid-pattern';
import { Floating3DBackground } from '@/components/features/floating-3d-background';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] text-white selection:bg-emerald-500/30 selection:text-white">
      {/* Premium Vercel/Stripe-inspired ambient background layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* SVG Grid pattern */}
        <GridPattern />
        
        {/* Ambient glows and spotlights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_60%)]" />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] rounded-full bg-emerald-500/3 blur-[140px]" />
      </div>

      <Floating3DBackground />

      <Navbar />
      <main className="relative z-10 flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
