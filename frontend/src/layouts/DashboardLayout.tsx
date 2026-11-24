import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarNavigation } from '../components/navigation/SidebarNavigation';
import { TopNavbar } from '../components/navigation/TopNavbar';
import { useAppConfig } from '../hooks/useAppConfig';
import { useAuth } from '../hooks/useAuth';

export interface DashboardLayoutProps {
  pageTitle: string;
  children: ReactNode;
}

/**
 * Authenticated SaaS dashboard shell pairing the responsive sidebar, top navigation bar, and page workspace.
 */
export function DashboardLayout({ pageTitle, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { applicationName } = useAppConfig();
  const { currentUser, logoutUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  async function handleLogout() {
    await logoutUser();
    navigate('/login', { replace: true });
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <SidebarNavigation
        applicationName={applicationName}
        userRole={currentUser.userRole}
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar
          pageTitle={pageTitle}
          currentUser={currentUser}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onLogout={() => void handleLogout()}
        />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
