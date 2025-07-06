import { ReactNode } from "react";

// The root layout applies to all routes and is used to configure the HTML document.
// This is a pass-through component, as the main layout is now in `src/app/[locale]/layout.tsx`.
export default function RootLayout({children}: {children: ReactNode}) {
  return children;
}
