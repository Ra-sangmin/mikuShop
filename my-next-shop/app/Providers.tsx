// app/Providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
import { MikuAlertProvider } from "./context/MikuAlertContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MikuAlertProvider>
        {children}
      </MikuAlertProvider>
    </SessionProvider>
  );
}
