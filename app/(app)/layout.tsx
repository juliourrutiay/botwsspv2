import { AppSidebar } from '@/components/app-sidebar';
import { signOutAction } from '@/app/actions/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
        <div className="mb-5 flex justify-end lg:hidden">
          <form action={signOutAction}><button className="btn-secondary">Salir</button></form>
        </div>
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
