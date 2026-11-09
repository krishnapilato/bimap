export const PERSON_NAME = /^\p{L}[\p{L}\p{M} '’.-]*$/u;
export const PLAIN_TEXT = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} '’".,;:?!()[\]/+*&°_-]*$/u;
export const NAME_MESSAGE = 'Names can only contain letters, spaces, apostrophes, dots and hyphens.';
export const TEXT_MESSAGE = 'Use letters, numbers and common punctuation only, starting with a letter or number.';
export const EMAIL = /^[A-Za-z0-9._%+-]+@(?![^@]*\.\.)[A-Za-z0-9-]+\.[A-Za-z0-9.-]+(?<!\.)$/;

export function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function textError(value: string, rule: RegExp, message: string): { kind: string; message: string } | null {
  return value && !rule.test(value) ? { kind: 'characters', message } : null;
}

export function passwordError(password: string): { kind: string; message: string } | null {
  return new TextEncoder().encode(password).length > 72
    ? { kind: 'bytes', message: 'Password must fit within 72 UTF-8 bytes.' }
    : null;
}

export function integerError(value: number | null): { kind: string; message: string } | null {
  return value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647)
    ? { kind: 'integer', message: 'Enter a whole number between 0 and 2147483647.' }
    : null;
}
