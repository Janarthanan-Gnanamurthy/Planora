import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Project Management System',
  description: 'Manage your projects and tasks efficiently',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64">
              {children}
            </main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
} 