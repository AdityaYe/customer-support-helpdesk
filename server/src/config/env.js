import dotenv from 'dotenv';

dotenv.config();

export const getEnv = (name, fallback = undefined) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value;
};

export const requireEnv = (name) => {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

export const validateServerEnv = () => {
  requireEnv('MONGODB_URI');
  requireEnv('JWT_SECRET');
};

export const clientUrl = () => getEnv('CLIENT_URL', 'http://localhost:5173');
export const uploadDir = () => getEnv('UPLOAD_DIR', 'uploads');
