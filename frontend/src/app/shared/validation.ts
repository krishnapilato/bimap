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
