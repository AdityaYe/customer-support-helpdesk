import Category from '../models/Category.js';
import Department from '../models/Department.js';
import RequestType from '../models/RequestType.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const active = { active: true };

export const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find(active).sort('name');
  res.json({ success: true, data: departments });
});

export const getCategories = asyncHandler(async (req, res) => {
  const query = { ...active };
  if (req.query.department) query.department = req.query.department;

  const categories = await Category.find(query).populate('department', 'name').sort('name');
  res.json({ success: true, data: categories });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, ...active }).populate('department', 'name');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.json({ success: true, data: category });
});

export const getRequestTypes = asyncHandler(async (req, res) => {
  const query = { ...active };
  const search = req.query.search?.trim();

  if (req.query.category) query.category = req.query.category;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { faqContent: { $regex: search, $options: 'i' } }
    ];
  }

  const requestTypes = await RequestType.find(query)
    .populate('category', 'name')
    .populate('department', 'name')
    .sort('name');

  res.json({ success: true, data: requestTypes });
});

export const getRequestType = asyncHandler(async (req, res) => {
  const requestType = await RequestType.findOne({ _id: req.params.id, ...active })
    .populate('category', 'name')
    .populate('department', 'name');

  if (!requestType) {
    throw new AppError('Request type not found', 404);
  }

  res.json({ success: true, data: requestType });
});
