import type {Metadata} from 'next';
import { Inter, Barlow } from 'next/font/google';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const barlow = Barlow({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading' 
});

export const metadata: Metadata = {
  title: 'Corenix Club Software',
  description: 'Gym management web application for internal staff use.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable} antialiased text-white`}>
      <body className="bg-[#0D0D0D] font-sans" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
