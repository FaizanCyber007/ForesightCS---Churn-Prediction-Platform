'use client';

import { useState } from 'react';
import { Bell, Building2, ChevronRight, Shield, User, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { cn } from '@/lib/cn';
import { ProfileSettings } from '@/components/features/settings/profile-settings';
import { WorkspaceSettings } from '@/components/features/settings/workspace-settings';
import { NotificationSettings } from '@/components/features/settings/notification-settings';
import { SecuritySettings } from '@/components/features/settings/security-settings';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type TabId = (typeof tabs)[number]['id'];

const TAB_CONTENT: Record<TabId, React.ComponentType> = {
  profile: ProfileSettings,
  workspace: WorkspaceSettings,
  notifications: NotificationSettings,
  security: SecuritySettings,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const ActiveTabContent = TAB_CONTENT[activeTab];

  return (
    <PageWrapper className="space-y-8 py-8 lg:py-10">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Workspace</p>
        <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-7 w-7 text-emerald-400" />
          Settings
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400 leading-relaxed">
          Manage your personal account, security parameters, notifications, and integration signals.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr] items-start">
        {/* Sidebar tabs */}
        <nav className="flex flex-col gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold text-left transition-all',
                  isActive
                    ? 'border-emerald-400/25 bg-emerald-400/8 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.1)]'
                    : 'border-transparent text-zinc-500 hover:border-white/5 hover:bg-white/3 hover:text-zinc-300'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-emerald-300' : 'text-zinc-500')} />
                {tab.label}
                {isActive && <ChevronRight className="ml-auto h-3 w-3 text-emerald-300/60" />}
              </button>
            );
          })}
        </nav>

        {/* Tab content wrapper */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveTabContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
