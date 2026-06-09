import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function generateOtp() {
  return `${crypto.randomInt(100000, 1000000)}`;
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

export async function compareOtp(otp, otpHash) {
  return bcrypt.compare(otp, otpHash);
}

