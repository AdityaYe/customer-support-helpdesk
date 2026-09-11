import jwt from 'jsonwebtoken';
import { requireEnv } from '../config/env.js';

export const generateToken = (userId) => {
  return jwt.sign({ userId }, requireEnv('JWT_SECRET'), { expiresIn: '7d' });
};

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
};
