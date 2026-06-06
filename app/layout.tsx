import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BotClínica WhatsApp MVP',
  description: 'SaaS de atención y automatización conversacional por WhatsApp.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
