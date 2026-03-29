import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// 哈希密码
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 验证密码强度
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 6 || password.length > 20) {
    return { valid: false, message: '密码长度必须在6-20位之间' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个字母' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个数字' };
  }

  return { valid: true };
}
