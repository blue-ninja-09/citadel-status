import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Citadel Status",
  description: "Live server status for Citadel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#111111",
          colorInputBackground: "#181818",
          colorInputText: "#f0ece8",
          colorText: "#f0ece8",
          colorTextSecondary: "#a0a0a0",
          colorPrimary: "#8B2A2A",
          colorDanger: "#f87171",
          borderRadius: "4px",
        },
        elements: {
          card: { boxShadow: "none", border: "1px solid #1f1f1f" },
          formButtonPrimary: { backgroundColor: "#8B2A2A" },
        },
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
