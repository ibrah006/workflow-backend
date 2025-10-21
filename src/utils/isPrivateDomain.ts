/**
 * Checks if an email address belongs to a private (non-public) domain.
 * 
 * @param email - The email address to check.
 * @returns true if it's a private/corporate domain, false if it's a public/free domain.
 */
export function isPrivateDomainEmail(email: string): boolean {
    if (!email || !email.includes('@')) return false;
  
    const publicDomains = new Set([
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'icloud.com',
      'aol.com',
      'protonmail.com',
      'zoho.com',
      'mail.com',
      'gmx.com',
      'yandex.com',
      'me.com'
    ]);
  
    const domain = email.split('@')[1].toLowerCase().trim();
  
    return !publicDomains.has(domain);
  }