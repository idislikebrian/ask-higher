import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask Higher — Make yourself easier to find",
  description: "A conversational discovery profile for the Higher network.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
