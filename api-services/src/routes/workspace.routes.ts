// api-services/src/routes/workspace.routes.ts
import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const workspaceController = new WorkspaceController();

// Apply authentication to all routes
router.use(authenticate);

// Get all workspaces for current user
router.get('/',
  asyncHandler(workspaceController.getUserWorkspaces.bind(workspaceController))
);

// Create new workspace
router.post('/',
  asyncHandler(workspaceController.createWorkspace.bind(workspaceController))
);

// Get specific workspace
router.get('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(workspaceController.getWorkspace.bind(workspaceController))
);

// Update workspace
router.put('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.updateWorkspace.bind(workspaceController))
);

// Delete workspace
router.delete('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['owner']),
  asyncHandler(workspaceController.deleteWorkspace.bind(workspaceController))
);

// Get workspace members
router.get('/:workspaceId/members',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(workspaceController.getWorkspaceMembers.bind(workspaceController))
);

// Add member to workspace
router.post('/:workspaceId/members',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.addWorkspaceMember.bind(workspaceController))
);

// Update member role
router.put('/:workspaceId/members/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.updateMemberRole.bind(workspaceController))
);

// Remove member from workspace
router.delete('/:workspaceId/members/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.removeMember.bind(workspaceController))
);

export default router;