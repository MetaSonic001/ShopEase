/**
 * Privacy Filter for Session Recording
 * 
 * Provides configuration and utilities for masking sensitive data
 * during session recording.
 */

/**
 * rrweb mask input configuration
 * Determines which input types should be masked during recording
 */
export const maskInputOptions = {
  // Passwords - always mask
  password: true,
  
  // Email - mask to protect PII
  email: true,
  
  // Telephone - mask to protect PII
  tel: true,
  
  // Text inputs - don't mask by default (can contain product searches, etc.)
  // But specific selectors below will mask sensitive text inputs
  text: false,
  
  // Textareas - don't mask by default
  textarea: false,
  
  // Select dropdowns - don't mask
  select: false,
  
  // Checkboxes and radios - don't mask (non-sensitive)
  checkbox: false,
  radio: false,
  
  // Numbers - don't mask by default
  // But credit card selectors below will catch sensitive numbers
  number: false,
  
  // Dates - don't mask
  date: false,
  datetime: false,
  month: false,
  time: false,
  week: false,
  
  // Other input types
  color: false,
  range: false,
  search: false,
  url: false,
};

/**
 * Text masking configuration
 * Defines CSS selectors for elements whose text content should be masked
 */
export const maskTextOptions = {
  // Mask text in elements with these classes or attributes
  textSelector: [
    // Credit card inputs
    '[data-sensitive]',
    '[data-private]',
    '.credit-card',
    '.card-number',
    '.cvv',
    '.cvc',
    '.card-cvv',
    '.card-cvc',
    
    // SSN and tax ID
    '.ssn',
    '.social-security',
    '.tax-id',
    '.ein',
    
    // Personal information
    '.personal-info',
    '.private',
    '.confidential',
    
    // Payment information
    '.billing-info',
    '.payment-info',
    
    // Inputs with sensitive names
    'input[name*="password"]',
    'input[name*="creditcard"]',
    'input[name*="credit-card"]',
    'input[name*="card-number"]',
    'input[name*="cardnumber"]',
    'input[name*="cvv"]',
    'input[name*="cvc"]',
    'input[name*="ssn"]',
    'input[name*="social-security"]',
    'input[name*="tax-id"]',
    
    // Inputs with sensitive IDs
    'input[id*="password"]',
    'input[id*="creditcard"]',
    'input[id*="credit-card"]',
    'input[id*="card-number"]',
    'input[id*="cvv"]',
    'input[id*="cvc"]',
    'input[id*="ssn"]',
    
    // Generic sensitive inputs
    'input[autocomplete="cc-number"]',
    'input[autocomplete="cc-csc"]',
    'input[autocomplete="cc-exp"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
  ].join(', '),
};

/**
 * Additional privacy utilities
 */

/**
 * Check if a string looks like a credit card number
 */
export function looksLikeCreditCard(value: string): boolean {
  // Remove spaces and dashes
  const cleaned = value.replace(/[\s-]/g, '');
  
  // Check if it's 13-19 digits (standard card lengths)
  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }
  
  // Luhn algorithm check
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Check if a string looks like an email
 */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Check if a string looks like a phone number
 */
export function looksLikePhone(value: string): boolean {
  // Remove common phone number characters
  const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it's 10-15 digits (international phone range)
  return /^\+?\d{10,15}$/.test(cleaned);
}

/**
 * Check if a string looks like an SSN
 */
export function looksLikeSSN(value: string): boolean {
  // US SSN format: XXX-XX-XXXX
  return /^\d{3}-?\d{2}-?\d{4}$/.test(value);
}

/**
 * Mask a value based on its type
 */
export function maskValue(value: string, type: 'email' | 'phone' | 'card' | 'ssn' | 'generic' = 'generic'): string {
  if (!value) return value;
  
  switch (type) {
    case 'email':
      // Show first char and domain: j***@example.com
      const emailParts = value.split('@');
      if (emailParts.length === 2) {
        return `${emailParts[0][0]}***@${emailParts[1]}`;
      }
      return '***';
      
    case 'phone':
      // Show last 4 digits: ***-***-1234
      const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.length >= 4) {
        return `***-***-${cleaned.slice(-4)}`;
      }
      return '***';
      
    case 'card':
      // Show last 4 digits: **** **** **** 1234
      const cardCleaned = value.replace(/[\s\-]/g, '');
      if (cardCleaned.length >= 4) {
        return `**** **** **** ${cardCleaned.slice(-4)}`;
      }
      return '****';
      
    case 'ssn':
      // Show last 4 digits: ***-**-1234
      const ssnCleaned = value.replace(/-/g, '');
      if (ssnCleaned.length >= 4) {
        return `***-**-${ssnCleaned.slice(-4)}`;
      }
      return '***';
      
    case 'generic':
    default:
      // Replace with asterisks
      return '*'.repeat(Math.min(value.length, 8));
  }
}

/**
 * Detect and mask sensitive values automatically
 */
export function autoMaskValue(value: string): string {
  if (!value || value.length === 0) return value;
  
  if (looksLikeCreditCard(value)) {
    return maskValue(value, 'card');
  }
  
  if (looksLikeEmail(value)) {
    return maskValue(value, 'email');
  }
  
  if (looksLikePhone(value)) {
    return maskValue(value, 'phone');
  }
  
  if (looksLikeSSN(value)) {
    return maskValue(value, 'ssn');
  }
  
  // Return original value if not sensitive
  return value;
}

/**
 * Sanitize an object by masking sensitive fields
 */
export function sanitizeObject(obj: Record<string, any>, sensitiveKeys: string[] = []): Record<string, any> {
  const defaultSensitiveKeys = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'private_key',
    'credit_card',
    'creditcard',
    'card_number',
    'cardnumber',
    'cvv',
    'cvc',
    'ssn',
    'social_security',
    'tax_id',
  ];
  
  const allSensitiveKeys = [...defaultSensitiveKeys, ...sensitiveKeys];
  
  const sanitized: Record<string, any> = { ...obj };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key matches sensitive patterns
    const isSensitive = allSensitiveKeys.some(sensitiveKey => 
      lowerKey.includes(sensitiveKey)
    );
    
    if (isSensitive && typeof sanitized[key] === 'string') {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'string') {
      // Auto-detect sensitive values
      sanitized[key] = autoMaskValue(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(sanitized[key], sensitiveKeys);
    }
  }
  
  return sanitized;
}
