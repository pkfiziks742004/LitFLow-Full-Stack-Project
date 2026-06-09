import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

export function createJwt(user) {
  const subject = user.id || user._id;

  return jwt.sign(
    {
      sub: subject.toString(),
      email: user.email,
      plan: user.plan
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}
