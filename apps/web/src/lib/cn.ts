import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The `cn` helper every Aceternity component expects.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
