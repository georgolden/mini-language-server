import { hashPassword, verifyPassword } from './crypto.js';

describe('Crypto Utils', () => {
  it('should hash password and verify it correctly', async () => {
    const password = 'test-password';
    const hash = await hashPassword(password);

    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'test-password';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(hash1, password)).toBe(true);
    expect(await verifyPassword(hash2, password)).toBe(true);
  });
});
