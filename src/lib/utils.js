import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind class lists, resolving conflicts (later wins). The one helper
// every shadcn/ui component uses.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
