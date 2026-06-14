/**
 * Input Sanitization & Validation Utilities
 * 
 * Provides defense-in-depth against XSS, injection, and malformed data.
 * All user inputs MUST pass through these functions before being written
 * to Firestore or rendered in the UI.
 */

// ─── HTML / XSS Sanitization ───────────────────────────────────────────────

/** Strip all HTML tags from a string to prevent XSS */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Encode special HTML characters to prevent reflected XSS */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * General-purpose text sanitizer.
 * - Strips HTML tags
 * - Trims whitespace
 * - Enforces max length
 * - Removes null bytes and control characters (except newline/tab)
 */
export function sanitizeText(input: string, maxLength: number = 200): string {
  if (!input || typeof input !== 'string') return '';
  
  let clean = input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except \n and \t
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Trim
    .trim();
  
  // Enforce max length
  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }
  
  return clean;
}

// ─── Field-Specific Sanitizers ──────────────────────────────────────────────

/** Sanitize phone number — only digits and + allowed */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d+]/g, '').slice(0, 15);
}

/** Sanitize email — basic format validation */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  // Basic email regex — not exhaustive, but catches obvious injections
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return '';
  return trimmed.slice(0, 254); // RFC 5321 max email length
}

/** Sanitize monetary amounts — strip everything except digits, decimal, and currency symbols */
export function sanitizeAmount(amount: string): string {
  if (!amount || typeof amount !== 'string') return '';
  // Allow digits, decimal point, and ₹/$/€ symbols
  return amount.replace(/[^\d.₹$€,]/g, '').slice(0, 20);
}

/** Sanitize date string — only allow YYYY-MM-DD format */
export function sanitizeDate(date: string): string {
  if (!date || typeof date !== 'string') return '';
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date.trim())) return '';
  // Verify it's a real date
  const parsed = new Date(date.trim());
  if (isNaN(parsed.getTime())) return '';
  return date.trim();
}

// ─── Composite Validators ───────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: Record<string, any>;
}

/** Validate and sanitize member data before Firestore write */
export function validateMemberData(data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else {
    sanitized.name = sanitizeText(data.name, 100);
  }

  if (!data.phone) {
    errors.push('Phone number is required');
  } else {
    const phone = sanitizePhone(data.phone);
    if (phone.length < 7) {
      errors.push('Phone number must be at least 7 digits');
    }
    sanitized.phone = phone;
  }

  if (!data.plan) {
    errors.push('Plan is required');
  } else {
    sanitized.plan = sanitizeText(data.plan, 50);
  }

  // Optional fields
  if (data.email) {
    const email = sanitizeEmail(data.email);
    if (!email && data.email.trim().length > 0) {
      errors.push('Invalid email format');
    }
    sanitized.email = email;
  }

  if (data.dob) {
    sanitized.dob = sanitizeDate(data.dob);
  }

  if (data.amount) {
    sanitized.amount = sanitizeAmount(data.amount);
  }

  if (data.startDate) {
    sanitized.startDate = sanitizeDate(data.startDate);
  }

  if (data.expiryDate) {
    sanitized.expiryDate = sanitizeDate(data.expiryDate);
  }

  // Pass through other safe fields with sanitization
  const textFields = ['status', 'gender', 'trainer', 'paymentMode'];
  for (const field of textFields) {
    if (data[field]) {
      sanitized[field] = sanitizeText(data[field], 100);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : data,
  };
}

/** Validate review data */
export function validateReviewData(data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Reviewer name is required');
  } else {
    sanitized.name = sanitizeText(data.name, 100);
  }

  if (!data.text || typeof data.text !== 'string' || data.text.trim().length < 3) {
    errors.push('Review text must be at least 3 characters');
  } else {
    sanitized.text = sanitizeText(data.text, 1000);
  }

  if (typeof data.r !== 'number' || data.r < 1 || data.r > 5) {
    errors.push('Rating must be between 1 and 5');
  } else {
    sanitized.r = Math.floor(data.r);
  }

  if (data.date) {
    sanitized.date = sanitizeDate(data.date) || new Date().toISOString().split('T')[0];
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : data,
  };
}

/** Sanitize settings data — all fields are text-based */
export function sanitizeSettings(data: Record<string, any>): Record<string, any> {
  return {
    ...data,
    gymName: data.gymName ? sanitizeText(data.gymName, 100) : undefined,
    address: data.address ? sanitizeText(data.address, 300) : undefined,
    phone: data.phone ? sanitizePhone(data.phone) : undefined,
    email: data.email ? sanitizeEmail(data.email) || data.email : undefined,
  };
}

// ─── Password Strength ──────────────────────────────────────────────────────

export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const PASSWORD_MIN_LENGTH = 8;

/** Evaluate password strength and check requirements */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };

  const passedCount = Object.values(requirements).filter(Boolean).length;

  const labels: PasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const score = Math.min(passedCount, 4) as 0 | 1 | 2 | 3 | 4;

  return {
    score,
    label: labels[score],
    requirements,
  };
}

/** Check if a password meets all minimum requirements */
export function isPasswordValid(password: string): boolean {
  const strength = evaluatePasswordStrength(password);
  return Object.values(strength.requirements).every(Boolean);
}
