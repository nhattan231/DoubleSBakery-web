import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppLayout from '@/components/layout/AppLayout';
import { QueryProvider } from '@/lib/queryClient';
import './globals.css';

export const metadata: Metadata = {
  title: 'Double S Bakery - Management System',
  description: 'Bakery Management System for Double S Bakery',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <QueryProvider>
          <AntdRegistry>
            <AppLayout>{children}</AppLayout>
          </AntdRegistry>
        </QueryProvider>
      </body>
    </html>
  );
}
