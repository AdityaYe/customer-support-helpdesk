import { body } from 'express-validator';
import User from '../models/User.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cookieOptions, generateToken } from '../utils/generateToken.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department
});

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

export const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const user = await User.create({ name, email, password, role: 'customer' });
  const token = generateToken(user._id);

  res.cookie('token', token, cookieOptions).status(201).json({
    success: true,
    user: publicUser(user)
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = generateToken(user._id);
  res.cookie('token', token, cookieOptions).json({
    success: true,
    user: publicUser(user)
  });
});

export const logout = (req, res) => {
  res.clearCookie('token', cookieOptions).json({ success: true, message: 'Logged out' });
};

export const me = (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
};
