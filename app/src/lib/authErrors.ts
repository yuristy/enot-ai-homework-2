// app/src/lib/authErrors.ts
//
// Supabase Auth's own error messages are English-only and can't be
// localized via project config — translate the ones a user actually hits
// (sign-up/sign-in) rather than showing English text in an otherwise fully
// Russian UI. Unrecognized messages pass through unchanged rather than
// being hidden, so a genuinely new error is still visible for debugging.

const KNOWN_MESSAGES: Record<string, string> = {
  'User already registered': 'Пользователь с таким email уже зарегистрирован.',
  'A user with this email address has already been registered':
    'Пользователь с таким email уже зарегистрирован.',
  'Invalid login credentials': 'Неверный email или пароль.',
  'Email not confirmed': 'Email не подтверждён.',
};

export function translateAuthError(message: string): string {
  const normalized = message.replace(/\.$/, '');
  return KNOWN_MESSAGES[normalized] ?? message;
}
