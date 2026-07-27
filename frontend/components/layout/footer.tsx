import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const footerLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
  { label: 'Login', href: '/login' },
  { label: 'Get Started', href: '/register' },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/8 px-6 py-8 text-sm text-zinc-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-xs font-bold text-emerald-200">
              F
            </div>
            <span className="text-sm font-semibold tracking-[0.2em]">FORESIGHTCS</span>
          </div>
          <p>Predictive customer success for SMB revenue teams.</p>
          <p className="text-xs">© {new Date().getFullYear()} ForesightCS, Inc. All rights reserved.</p>
        </div>

        <div className="flex flex-col gap-4 sm:items-end">
          <nav className="flex flex-wrap gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            <span>Built for modern revenue and CS teams</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
