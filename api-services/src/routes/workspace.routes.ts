// api-services/src/routes/workspaceRoutes.ts
import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { authenticateToken } from '../middleware/auth';
import { validateWorkspace } from '../middleware/workspace';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();
const workspaceController = new WorkspaceController();

// Validation schemas
const createWorkspaceValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Workspace name must be between 1 and 100 characters'),
  body('slug')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object'),
  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
];

const updateWorkspaceValidation = [
  param('id')
    .isUUID()
    .withMessage('Workspace ID must be a valid UUID'),
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Workspace name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object'),
  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];

const workspaceIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Workspace ID must be a valid UUID'),
];

const getAllWorkspacesValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('include_inactive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('include_inactive must be true or false'),
];

// Routes

/**
 * @route GET /api/workspaces
 * @desc Get user workspaces
 * @access Private
 */
router.get(
  '/',
  authenticateToken,
  workspaceController.getUserWorkspaces
);

/**
 * @route GET /api/workspaces/:id
 * @desc Get workspace by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticateToken,
  workspaceIdValidation,
  handleValidationErrors,
  workspaceController.getWorkspaceById
);

/**
 * @route POST /api/workspaces
 * @desc Create new workspace
 * @access Private
 */
router.post(
  '/',
  authenticateToken,
  createWorkspaceValidation,
  handleValidationErrors,
  workspaceController.createWorkspace
);

/**
 * @route PUT /api/workspaces/:id
 * @desc Update workspace
 * @access Private
 */
router.put(
  '/:id',
  authenticateToken,
  updateWorkspaceValidation,
  handleValidationErrors,
  workspaceController.updateWorkspace
);

/**
 * @route DELETE /api/workspaces/:id
 * @desc Delete workspace (soft delete)
 * @access Private
 */
router.delete(
  '/:id',
  authenticateToken,
  workspaceIdValidation,
  handleValidationErrors,
  workspaceController.deleteWorkspace
);

/**
 * @route GET /api/admin/workspaces
 * @desc Get all workspaces (admin only)
 * @access Private (Admin)
 */
router.get(
  '/admin/all',
  authenticateToken,
  // Add admin permission check here when implemented
  getAllWorkspacesValidation,
  handleValidationErrors,
  workspaceController.getAllWorkspaces
);

export default router;