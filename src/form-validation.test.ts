import { describe, expect, it } from 'vitest';
import {
  hasFieldError,
  validateContact,
  validateContactForm,
  validateInterest,
  validateName,
  validateNote,
} from './lib/form-validation';

describe('validateName', () => {
  it('rejects an empty name', () => {
    expect(validateName('   ').valid).toBe(false);
    expect(validateName('   ').message).toBe('请填写称呼');
  });

  it('rejects a single character', () => {
    expect(validateName('王').valid).toBe(false);
  });

  it('rejects a name longer than 20 characters', () => {
    expect(validateName('寒'.repeat(21)).valid).toBe(false);
  });

  it('accepts a valid 2–20 character name', () => {
    expect(validateName('王小雅').valid).toBe(true);
  });
});

describe('validateContact', () => {
  it('rejects an empty contact', () => {
    expect(validateContact(' ').valid).toBe(false);
    expect(validateContact(' ').message).toBe('请填写联系方式');
  });

  it('rejects a malformed email', () => {
    expect(validateContact('not-an-email').valid).toBe(false);
  });

  it('accepts a valid email', () => {
    expect(validateContact('wang@example.com').valid).toBe(true);
  });

  it('accepts a valid 11-digit CN mobile number', () => {
    expect(validateContact('13800138000').valid).toBe(true);
  });

  it('rejects an invalid phone number', () => {
    expect(validateContact('23800138000').valid).toBe(false);
    expect(validateContact('13800').valid).toBe(false);
  });
});

describe('validateInterest', () => {
  it('rejects an empty interest', () => {
    expect(validateInterest('').valid).toBe(false);
  });

  it('accepts a selected interest', () => {
    expect(validateInterest('产品咨询').valid).toBe(true);
  });
});

describe('validateNote', () => {
  it('accepts an empty note', () => {
    expect(validateNote('').valid).toBe(true);
  });

  it('rejects a note longer than 200 characters', () => {
    expect(validateNote('备'.repeat(201)).valid).toBe(false);
  });

  it('accepts a note of up to 200 characters', () => {
    expect(validateNote('备'.repeat(200)).valid).toBe(true);
  });
});

describe('validateContactForm / hasFieldError', () => {
  it('flags required fields when the form is empty', () => {
    const errors = validateContactForm({ name: '', contact: '', interest: '', note: '' });
    expect(hasFieldError(errors)).toBe(true);
    expect(errors.name.valid).toBe(false);
    expect(errors.contact.valid).toBe(false);
    expect(errors.interest.valid).toBe(false);
    expect(errors.note.valid).toBe(true);
  });

  it('passes a fully valid form', () => {
    const errors = validateContactForm({
      name: '王小雅',
      contact: 'wang@example.com',
      interest: '产品咨询',
      note: '想了解更多寒川03 的技术细节',
    });
    expect(hasFieldError(errors)).toBe(false);
  });

  it('catches a single invalid field among valid ones', () => {
    const errors = validateContactForm({
      name: '王小雅',
      contact: '13800138000',
      interest: '',
      note: '',
    });
    expect(hasFieldError(errors)).toBe(true);
    expect(errors.interest.message).toBe('请选择关注方向');
  });
});
