import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/context/auth-context';
import { SuppressWarnings } from '@/components/suppress-warnings';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetBrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'ForesightCS — Predictive Customer Success',
    template: '%s | ForesightCS',
  },
  description:
    'ForesightCS blends product telemetry, billing posture, support intensity, and account context into a premium operating system for modern customer success teams.',
  keywords: ['customer success', 'churn prediction', 'revenue intelligence', 'SaaS', 'account health'],
  openGraph: {
    title: 'ForesightCS — Predictive Customer Success',
    description: 'Predict churn before it becomes a revenue event.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white" suppressHydrationWarning>
        <SuppressWarnings />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
