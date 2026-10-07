import { describe, expect, it } from 'vitest';

import { canSendBudgetAlertPush } from './eligibility';

describe('canSendBudgetAlertPush', () => {
  it('envía a un usuario con las push activadas y algún dispositivo suscrito', () => {
    expect(
      canSendBudgetAlertPush({ isAnonymous: false, notifyPush: true, subscriptionCount: 2 }),
    ).toBe(true);
  });

  it('no envía a usuarios anónimos de la demo', () => {
    expect(
      canSendBudgetAlertPush({ isAnonymous: true, notifyPush: true, subscriptionCount: 1 }),
    ).toBe(false);
  });

  it('no envía si la cuenta desactivó las push', () => {
    expect(
      canSendBudgetAlertPush({ isAnonymous: false, notifyPush: false, subscriptionCount: 1 }),
    ).toBe(false);
  });

  it('no envía si no hay ningún dispositivo suscrito', () => {
    expect(
      canSendBudgetAlertPush({ isAnonymous: false, notifyPush: true, subscriptionCount: 0 }),
    ).toBe(false);
  });
});
