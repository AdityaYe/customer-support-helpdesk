import Category from '../models/Category.js';
import Department from '../models/Department.js';
import Message from '../models/Message.js';
import RequestType from '../models/RequestType.js';
import SavedReply from '../models/SavedReply.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { buildTicketAnalytics } from '../services/analyticsService.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const resources = ['departments', 'categories', 'request-types', 'users'];
const roles = ['customer', 'agent', 'manager', 'admin'];
const fieldTypes = ['text', 'number', 'select', 'textarea', 'date'];

const getModel = (resource) => {
  const models = {
    departments: Department,
    categories: Category,
    'request-types': RequestType,
    users: User
  };
  const Model = models[resource];
  if (!Model) throw new AppError('Unknown admin resource', 404);
  return Model;
};

const pick = (body, keys) => {
  const payload = {};
  keys.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  return payload;
};

const ensureDepartment = async (id) => {
  const department = await Department.findById(id);
  if (!department) throw new AppError('Department is invalid', 400);
  return department;
};

const ensureCategory = async (id) => {
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category is invalid', 400);
  return category;
};

const validateFormFields = (formFields = []) => {
  if (!Array.isArray(formFields)) throw new AppError('Form fields must be an array', 400);

  return formFields.map((field) => {
    if (!field.name || !field.label) throw new AppError('Each form field needs a name and label', 400);
    if (!fieldTypes.includes(field.type)) throw new AppError(`Unsupported form field type: ${field.type}`, 400);
    return {
      name: String(field.name).trim(),
      label: String(field.label).trim(),
      type: field.type,
      required: Boolean(field.required),
      options: field.type === 'select' ? (field.options || []).map((option) => String(option).trim()).filter(Boolean) : []
    };
  });
};

const validatePayload = async (resource, body, existing = null) => {
  if (resource === 'departments') {
    const payload = pick(body, ['name', 'description', 'active']);
    if (!existing && !payload.name) throw new AppError('Department name is required', 400);
    return payload;
  }

  if (resource === 'categories') {
    const payload = pick(body, ['name', 'description', 'department', 'active']);
    if (!existing && !payload.name) throw new AppError('Category name is required', 400);
    if (!existing && !payload.department) throw new AppError('Category department is required', 400);
    if (payload.department) await ensureDepartment(payload.department);
    return payload;
  }

  if (resource === 'request-types') {
    const payload = pick(body, ['name', 'description', 'category', 'department', 'faqTitle', 'faqContent', 'active', 'formFields']);
    for (const key of ['name', 'category', 'department', 'faqTitle', 'faqContent']) {
      if (!existing && !payload[key]) throw new AppError(`Request type ${key} is required`, 400);
    }
    if (payload.department) await ensureDepartment(payload.department);
    if (payload.category) {
      const category = await ensureCategory(payload.category);
      const department = payload.department || existing?.department;
      if (department && category.department.toString() !== department.toString()) {
        throw new AppError('Request type category must belong to the selected department', 400);
      }
    }
    if (payload.formFields) payload.formFields = validateFormFields(payload.formFields);
    return payload;
  }

  if (resource === 'users') {
    const payload = pick(body, ['name', 'email', 'password', 'role', 'department', 'active']);
    if (!existing && !payload.name) throw new AppError('User name is required', 400);
    if (!existing && !payload.email) throw new AppError('User email is required', 400);
    if (!existing && !payload.password) throw new AppError('User password is required', 400);
    if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) throw new AppError('User email must be valid', 400);
    if (payload.role && !roles.includes(payload.role)) throw new AppError('User role is invalid', 400);

    const role = payload.role || existing?.role || 'customer';
    if (['agent', 'manager'].includes(role)) {
      const department = payload.department || existing?.department;
      if (!department) throw new AppError('Agents and managers require a department', 400);
      await ensureDepartment(department);
    }
    if (['customer', 'admin'].includes(role)) payload.department = null;
    return payload;
  }

  throw new AppError('Unknown admin resource', 404);
};

const buildListQuery = (resource, query) => {
  const filter = {};

  if (query.active === 'true') filter.active = true;
  if (query.active === 'false') filter.active = false;
  if (query.role && resource === 'users') filter.role = query.role;
  if (query.department && ['users', 'categories', 'request-types'].includes(resource)) filter.department = query.department;
  if (query.category && resource === 'request-types') filter.category = query.category;

  if (query.search?.trim()) {
    const term = query.search.trim();
    const fields = {
      users: ['name', 'email'],
      departments: ['name', 'description'],
      categories: ['name', 'description'],
      'request-types': ['name', 'description', 'faqTitle', 'faqContent']
    }[resource];
    filter.$or = fields.map((field) => ({ [field]: { $regex: term, $options: 'i' } }));
  }

  return filter;
};

const populateResource = (resource, query) => {
  if (resource === 'users') return query.select('-password').populate('department', 'name');
  if (resource === 'categories') return query.populate('department', 'name');
  if (resource === 'request-types') return query.populate('department', 'name').populate('category', 'name department');
  return query;
};

export const getAdminSummary = asyncHandler(async (req, res) => {
  const [users, departments, categories, requestTypes, tickets, savedReplies] = await Promise.all([
    User.find().select('role'),
    Department.countDocuments(),
    Category.countDocuments(),
    RequestType.countDocuments(),
    Ticket.countDocuments(),
    SavedReply.countDocuments()
  ]);

  res.json({
    success: true,
    data: {
      totalUsers: users.length,
      customers: users.filter((user) => user.role === 'customer').length,
      agents: users.filter((user) => user.role === 'agent').length,
      managers: users.filter((user) => user.role === 'manager').length,
      admins: users.filter((user) => user.role === 'admin').length,
      departments,
      categories,
      requestTypes,
      tickets,
      savedReplies
    }
  });
});

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const analytics = await buildTicketAnalytics();
  res.json({ success: true, data: analytics });
});

export const listResources = asyncHandler(async (req, res) => {
  const Model = getModel(req.params.resource);
  const filter = buildListQuery(req.params.resource, req.query);
  const data = await populateResource(req.params.resource, Model.find(filter).sort({ createdAt: -1 }));
  res.json({ success: true, data });
});

export const createResource = asyncHandler(async (req, res) => {
  const Model = getModel(req.params.resource);
  const payload = await validatePayload(req.params.resource, req.body);
  const data = await Model.create(payload);
  const populated = await populateResource(req.params.resource, Model.findById(data._id));
  res.status(201).json({ success: true, data: populated });
});

export const updateResource = asyncHandler(async (req, res) => {
  const Model = getModel(req.params.resource);
  const existing = await Model.findById(req.params.id).select(req.params.resource === 'users' ? '+password' : '');
  if (!existing) throw new AppError('Resource not found', 404);

  const payload = await validatePayload(req.params.resource, req.body, existing);
  Object.assign(existing, payload);
  await existing.save();

  const data = await populateResource(req.params.resource, Model.findById(existing._id));
  res.json({ success: true, data });
});

export const deleteResource = asyncHandler(async (req, res) => {
  const { resource, id } = req.params;
  if (!resources.includes(resource)) throw new AppError('Unknown admin resource', 404);

  if (resource === 'departments') {
    const refs = await Promise.all([
      Category.countDocuments({ department: id }),
      RequestType.countDocuments({ department: id }),
      User.countDocuments({ department: id }),
      Ticket.countDocuments({ department: id })
    ]);
    if (refs.some(Boolean)) throw new AppError('Department cannot be deleted while it has related records', 400);
  }

  if (resource === 'categories') {
    const refs = await Promise.all([RequestType.countDocuments({ category: id }), Ticket.countDocuments({ category: id })]);
    if (refs.some(Boolean)) throw new AppError('Category cannot be deleted while it has related records', 400);
  }

  if (resource === 'request-types' && (await Ticket.exists({ requestType: id }))) {
    throw new AppError('Request type cannot be deleted while tickets reference it', 400);
  }

  if (resource === 'users') {
    const refs = await Promise.all([
      Ticket.countDocuments({ customer: id }),
      Ticket.countDocuments({ assignedTo: id }),
      Message.countDocuments({ sender: id })
    ]);
    if (refs.some(Boolean)) throw new AppError('User cannot be deleted while tickets or messages reference them', 400);
  }

  const Model = getModel(resource);
  const data = await Model.findByIdAndDelete(id);
  if (!data) throw new AppError('Resource not found', 404);
  res.json({ success: true, message: 'Resource deleted' });
});
