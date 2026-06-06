'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  Brain,
  ChartLineUp,
  ChatCircleText,
  GearSix,
  GraduationCap,
  Plugs,
  SlidersHorizontal
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: ChartLineUp },
  { href: '/conversaciones', label: 'Conversaciones', icon: ChatCircleText },
  { href: '/personalizacion', label: 'Personalización', icon: SlidersHorizontal },
  { href: '/integraciones', label: 'Integraciones', icon: Plugs },
  { href: '/aprendizajes', label: 'Aprendizajes', icon: GraduationCap },
  { href: '/configuracion', label: 'Configuración', icon: GearSix }
] satisfies ReadonlyArray<{ href: Route; label: string; icon: typeof ChartLineUp }>;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 border-r border-[#1F2937] bg-[#070A0D]/90 p-5 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#22C55E] text-[#031008]">
          <Brain size={24} weight="fill" />
        </div>
        <div>
          <p className="text-lg font-black">BotClínica</p>
          <p className="text-xs text-[#9CA3AF]">WhatsApp Automation</p>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9CA3AF] transition',
                active && 'bg-[#111827] text-white ring-1 ring-[#1F2937]'
              )}
            >
              <Icon size={20} weight={active ? 'fill' : 'regular'} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
