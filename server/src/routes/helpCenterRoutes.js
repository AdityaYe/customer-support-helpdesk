import express from 'express';
import {
  getCategories,
  getCategory,
  getDepartments,
  getRequestType,
  getRequestTypes
} from '../controllers/helpCenterController.js';

const router = express.Router();

router.get('/departments', getDepartments);
router.get('/categories', getCategories);
router.get('/categories/:id', getCategory);
router.get('/request-types', getRequestTypes);
router.get('/request-types/:id', getRequestType);

export default router;
