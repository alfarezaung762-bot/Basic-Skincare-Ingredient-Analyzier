// src/components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { DeepResearchProvider } from "./DeepResearchProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DeepResearchProvider>{children}</DeepResearchProvider>
    </SessionProvider>
  );
}
