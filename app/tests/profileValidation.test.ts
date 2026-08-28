// app/tests/profileValidation.test.ts
import { describe, expect, it } from 'vitest';
import { validateProfileRole } from '../src/features/cabinet/ProfileForm';

describe('validateProfileRole', () => {
  it('accepts "seeker"', () => {
    expect(validateProfileRole('seeker')).toBe('seeker');
  });

  it('accepts "photographer"', () => {
    expect(validateProfileRole('photographer')).toBe('photographer');
  });

  it('rejects anything else', () => {
    expect(validateProfileRole('admin')).toBeNull();
    expect(validateProfileRole('')).toBeNull();
  });
});
