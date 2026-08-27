export function getLimitErrorMessage(errorMessage: string | null, isAnonymous: boolean): string | null {
  if (!errorMessage || !errorMessage.includes('rate_limit_exceeded')) {
    return null;
  }
  return isAnonymous
    ? 'Дневной лимит исчерпан. Войдите, чтобы добавлять до 5 в день.'
    : 'Дневной лимит на сегодня исчерпан — попробуйте завтра.';
}
