export const WAITLIST_SHARE_TEXT = "I just joined the DupDub waitlist for easy Stellar payments. Join me and skip the line!";

export function buildReferralLink(origin: string, code: string): string {
  return `${origin}/waitlist?ref=${encodeURIComponent(code)}`;
}

export function buildTwitterShareUrl(link: string, text: string = WAITLIST_SHARE_TEXT): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
}

export function buildWhatsAppShareUrl(link: string, text: string = WAITLIST_SHARE_TEXT): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
}

/** Derives referral code and position from a tolerant waitlist join response. */
export function parseJoinResponse(data: any, fallbackCode: string): { position: number | null; code: string } {
  const rawPos = data?.position ?? data?.waitlistPosition ?? data?.rank;
  const position = typeof rawPos === 'number' && rawPos > 0 ? rawPos : null;
  const code = String(data?.referralCode ?? data?.code ?? fallbackCode);
  return { position, code };
}
