// This file is now a compatibility layer to prevent breaking imports.
// It re-exports from next/navigation and next/link.
import Link from 'next/link';
import { usePathname, useRouter, redirect } from 'next/navigation';

export { Link, redirect, usePathname, useRouter };
