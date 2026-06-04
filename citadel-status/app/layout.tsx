import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Citadel Status",
  description: "Live infrastructure status for Citadel servers",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      signInFallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorBackground: "#111111",
          colorInputBackground: "#161616",
          colorInputText: "#f0ece8",
          colorText: "#f0ece8",
          colorTextSecondary: "#a0a0a0",
          colorTextOnPrimaryBackground: "#ffffff",
          colorPrimary: "#8B2A2A",
          colorDanger: "#f87171",
          colorNeutral: "#f0ece8",
          borderRadius: "4px",
        },
        elements: {
          card: { backgroundColor: "#111111", boxShadow: "none", border: "1px solid #1f1f1f" },
          headerTitle: { color: "#f0ece8" },
          headerSubtitle: { color: "#a0a0a0" },
          socialButtonsBlockButton: { backgroundColor: "#161616", border: "1px solid #1f1f1f", color: "#f0ece8" },
          socialButtonsBlockButtonText: { color: "#f0ece8" },
          dividerLine: { backgroundColor: "#1f1f1f" },
          dividerText: { color: "#555555" },
          formFieldLabel: { color: "#a0a0a0" },
          formFieldInput: { backgroundColor: "#161616", border: "1px solid #1f1f1f", color: "#f0ece8" },
          formButtonPrimary: { backgroundColor: "#8B2A2A", color: "#ffffff" },
          footerActionLink: { color: "#8B2A2A" },
          footerActionText: { color: "#a0a0a0" },
        },
      }}
    >
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}