// api-services/src/routes/workspace.routes.ts (Debug Version 2)
import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const workspaceController = new WorkspaceController();

console.log('=== Workspace Controller Debug ===');
console.log('workspaceController:', typeof workspaceController);
console.log('getUserWorkspaces:', typeof workspaceController.getUserWorkspaces);
console.log('createWorkspace:', typeof workspaceController.createWorkspace);
console.log('getWorkspace:', typeof workspaceController.getWorkspace);
console.log('updateWorkspace:', typeof workspaceController.updateWorkspace);
console.log('deleteWorkspace:', typeof workspaceController.deleteWorkspace);
console.log('getWorkspaceMembers:', typeof workspaceController.getWorkspaceMembers);
console.log('addWorkspaceMember:', typeof workspaceController.addWorkspaceMember);
console.log('updateMemberRole:', typeof workspaceController.updateMemberRole);
console.log('removeMember:', typeof workspaceController.removeMember);
console.log('===================================');

// Apply authentication to all routes
router.use(authenticate);

// Get all workspaces for current user
router.get('/',
  asyncHandler(workspaceController.getUserWorkspaces)
);

// Create new workspace
router.post('/',
  asyncHandler(workspaceController.createWorkspace)
);

// Get specific workspace (line 28 - this might be the problem)
console.log('About to bind getWorkspace, type:', typeof workspaceController.getWorkspace);
router.get('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(workspaceController.getWorkspace)
);

// Update workspace
router.put('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.updateWorkspace)
);

// Delete workspace
router.delete('/:workspaceId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['owner']),
  asyncHandler(workspaceController.deleteWorkspace)
);

// Get workspace members
router.get('/:workspaceId/members',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(workspaceController.getWorkspaceMembers)
);

// Add member to workspace
router.post('/:workspaceId/members',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.addWorkspaceMember)
);

// Update member role
router.put('/:workspaceId/members/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.updateMemberRole)
);

// Remove member from workspace
router.delete('/:workspaceId/members/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(workspaceController.removeMember)
);

export default router;