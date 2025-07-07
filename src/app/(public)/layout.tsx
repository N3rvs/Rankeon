'use client';

import { PublicLayout } from "@/components/public-layout";
import { ReactNode } from "react";

export default function PublicAppLayout({ children }: { children: ReactNode }) {
    return <PublicLayout>{children}</PublicLayout>;
}
