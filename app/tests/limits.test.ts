import { describe, expect, it } from 'vitest';
import { getLimitErrorMessage } from '../src/lib/limits';

describe('getLimitErrorMessage', () => {
  it('returns the guest upsell message when the anonymous limit is hit', () => {
    const message = getLimitErrorMessage('rate_limit_exceeded', true);
    expect(message).toBe('Дневной лимит исчерпан. Войдите, чтобы добавлять до 5 в день.');
  });

  it('returns a plain limit message for a registered account', () => {
    const message = getLimitErrorMessage('rate_limit_exceeded', false);
    expect(message).toBe('Дневной лимит на сегодня исчерпан — попробуйте завтра.');
  });

  it('returns null for an unrelated error', () => {
    expect(getLimitErrorMessage('duplicate key value violates unique constraint', false)).toBeNull();
  });

  it('returns null when there is no error', () => {
    expect(getLimitErrorMessage(null, false)).toBeNull();
  });
});
