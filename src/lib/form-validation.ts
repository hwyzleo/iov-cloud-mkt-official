/**
 * Pure form-validation logic for the contact form (testable in isolation).
 */

export interface FieldError {
  valid: boolean;
  message: string;
}

export interface ContactFormValues {
  name: string;
  contact: string;
  interest: string;
  note: string;
}

export type ContactFieldName = keyof ContactFormValues;

export type ContactFormErrors = Record<ContactFieldName, FieldError>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^1\d{10}$/;

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 20;
export const NOTE_MAX_LENGTH = 200;

export function validateName(value: string): FieldError {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: '请填写称呼' };
  if (trimmed.length < NAME_MIN_LENGTH || trimmed.length > NAME_MAX_LENGTH) {
    return { valid: false, message: '称呼需为 2–20 个字符' };
  }
  return { valid: true, message: '' };
}

export function validateContact(value: string): FieldError {
  const trimmed = value.trim();
  if (trimmed.length === 0) return { valid: false, message: '请填写联系方式' };
  if (!EMAIL_RE.test(trimmed) && !PHONE_RE.test(trimmed)) {
    return { valid: false, message: '请输入有效的邮箱或 11 位手机号' };
  }
  return { valid: true, message: '' };
}

export function validateInterest(value: string): FieldError {
  if (value.trim().length === 0) return { valid: false, message: '请选择关注方向' };
  return { valid: true, message: '' };
}

export function validateNote(value: string): FieldError {
  if (value.trim().length > NOTE_MAX_LENGTH) {
    return { valid: false, message: `备注不超过 ${NOTE_MAX_LENGTH} 字` };
  }
  return { valid: true, message: '' };
}

export function validateContactForm(values: ContactFormValues): ContactFormErrors {
  return {
    name: validateName(values.name),
    contact: validateContact(values.contact),
    interest: validateInterest(values.interest),
    note: validateNote(values.note),
  };
}

export function hasFieldError(errors: ContactFormErrors): boolean {
  return Object.values(errors).some((error) => !error.valid);
}
