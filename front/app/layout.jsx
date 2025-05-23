import { Inter } from 'next/font/google';

import { AuthProvider } from '../context/AuthContext';
import Header from '../components/header/Header';
import Footer from "../components/footer/Footer"

import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: "Flowbite React Template Next.js",
  description: "Generated by create-flowbite-react",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
