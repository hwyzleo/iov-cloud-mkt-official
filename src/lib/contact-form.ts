import { SITE_CONFIG } from '../site-config';
import { validateContactForm, type ContactFieldName } from './form-validation';

interface FieldEls {
  name: HTMLInputElement;
  contact: HTMLInputElement;
  interest: HTMLSelectElement;
  note: HTMLTextAreaElement;
}

type AnyFieldEl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function setFieldState(field: HTMLElement, errorEl: HTMLElement, message: string, valid: boolean): void {
  field.classList.toggle('has-error', !valid);
  errorEl.textContent = message;
}

/**
 * Binds the contact form. Demo mode only: validates locally, simulates a
 * short delay and shows success feedback. No real data is sent or stored.
 */
export function initContactForm(form: HTMLFormElement): void {
  const fields: FieldEls = {
    name: form.elements.namedItem('name') as HTMLInputElement,
    contact: form.elements.namedItem('contact') as HTMLInputElement,
    interest: form.elements.namedItem('interest') as HTMLSelectElement,
    note: form.elements.namedItem('note') as HTMLTextAreaElement,
  };

  const statusEl = form.querySelector<HTMLElement>('#form-status');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const errorEls: Record<ContactFieldName, HTMLElement> = {
    name: form.querySelector<HTMLElement>('#f-name-error')!,
    contact: form.querySelector<HTMLElement>('#f-contact-error')!,
    interest: form.querySelector<HTMLElement>('#f-interest-error')!,
    note: form.querySelector<HTMLElement>('#f-note-error')!,
  };

  const validate = (): void => {
    const errors = validateContactForm({
      name: fields.name.value,
      contact: fields.contact.value,
      interest: fields.interest.value,
      note: fields.note.value,
    });
    (Object.keys(errors) as ContactFieldName[]).forEach((key) => {
      const error = errors[key];
      setFieldState(fields[key] as AnyFieldEl, errorEls[key], error.message, error.valid);
    });
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validate();
    if (statusEl) statusEl.textContent = '';

    if (form.querySelector('.has-error') !== null) {
      if (statusEl) {
        statusEl.textContent = '请检查并完善标记的字段。';
        statusEl.classList.add('is-error');
      }
      return;
    }

    // Demo mode: simulate latency, then report success without sending data.
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '提交中…';
    }
    window.setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交预约交流';
      }
      if (statusEl) {
        statusEl.textContent = '提交成功（演示模式，未发送真实数据）。感谢关注，我们会尽快与你联系。';
        statusEl.classList.remove('is-error');
        statusEl.classList.add('is-success');
      }
      form.reset();
    }, SITE_CONFIG.demoSubmitDelayMs);
  });

  // Clear a field's error as the user types.
  (Object.keys(fields) as ContactFieldName[]).forEach((key) => {
    fields[key].addEventListener('input', () => {
      setFieldState(fields[key] as AnyFieldEl, errorEls[key], '', true);
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.classList.remove('is-error', 'is-success');
      }
    });
  });
}
