import { describe, expect, it } from 'vitest';

import { canSendBudgetAlertEmail } from './budget-alert-eligibility';

describe('canSendBudgetAlertEmail', () => {
  it('envía a un usuario normal con los emails activados', () => {
    expect(
      canSendBudgetAlertEmail({ email: 'a@example.com', isAnonymous: false, notifyEmail: true }),
    ).toBe(true);
  });

  it('no envía si el usuario desactivó los emails', () => {
    expect(
      canSendBudgetAlertEmail({ email: 'a@example.com', isAnonymous: false, notifyEmail: false }),
    ).toBe(false);
  });

  it('no envía a usuarios anónimos de la demo', () => {
    expect(
      canSendBudgetAlertEmail({ email: undefined, isAnonymous: true, notifyEmail: true }),
    ).toBe(false);
    expect(
      canSendBudgetAlertEmail({ email: 'a@example.com', isAnonymous: true, notifyEmail: true }),
    ).toBe(false);
  });

  it('no envía si la cuenta no tiene email o está vacío', () => {
    expect(
      canSendBudgetAlertEmail({ email: undefined, isAnonymous: false, notifyEmail: true }),
    ).toBe(false);
    expect(canSendBudgetAlertEmail({ email: '', isAnonymous: false, notifyEmail: true })).toBe(
      false,
    );
  });
});
