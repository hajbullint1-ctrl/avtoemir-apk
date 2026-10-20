import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a phone for https://wa.me/LINKS.
 * WhatsApp needs digits only with country code (no +, spaces, or leading 8).
 * Kazakhstan / common local forms:
 *   +7 701 111 11 11  → 77011111111
 *   8 701 111 11 11   → 77011111111
 *   701 111 11 11     → 77011111111
 */
export function toWhatsAppNumber(phone: string): string {
  let d = phone.replace(/\D/g, '')
  if (!d) return ''
  // Local mobile starting with 8 (11 digits) → country code 7
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  // 10 digits without country code → assume +7 (KZ/RU)
  if (d.length === 10) d = '7' + d
  return d
}
