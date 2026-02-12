import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paper | Prediction Market Hedging",
  description: "Hedge your business risks with prediction markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} antialiased flex flex-col min-h-screen`}
      >
        <nav className="w-full border-b-3 border-coffee bg-white px-8 py-4 flex justify-between items-center sticky top-0 z-50">
          <Link href="/" className="text-2xl font-serif font-black tracking-tighter text-coffee">
            PAPER<span className="text-pistachio">.</span>
          </Link>
          <div className="flex gap-8 font-sans font-bold text-coffee uppercase tracking-wide text-sm">
            <Link href="/" className="hover:text-pistachio transition-colors">Home</Link>
            <Link href="/dashboard" className="hover:text-pistachio transition-colors">Dashboard</Link>
            <Link href="/markets" className="hover:text-pistachio transition-colors">Markets</Link>
            <Link href="/portfolio" className="hover:text-pistachio transition-colors">Portfolio</Link>
          </div>
        </nav>
        <main className="flex-grow flex flex-col">{children}</main>
        <footer className="w-full border-t-3 border-coffee py-8 text-center text-coffee-light font-sans font-medium text-sm">
          © {new Date().getFullYear()} Paper. Business Hedging via Prediction Markets.
        </footer>
      </body>
    </html>
  );
}
