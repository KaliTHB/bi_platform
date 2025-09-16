# User Management API Documentation

## Authentication & Authorization

All endpoints require authentication via Bearer token:
```
Authorization: Bearer <jwt_token>
X-Workspace-ID: <workspace_id>
```

### Authorization Levels:
- **Super Admin**: All permissions
- **Workspace Admin**: Workspace-specific admin permissions
- **Editor**: Limited create/update permissions
- **Viewer**: Read-only access

---

## 1. Users API (`/api/users`)

### List Users
```http
GET /api/users
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): active | inactive | all
- `role` (optional): Filter by role name
- `search` (optional): Search by name/email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "johndoe",
        "email": "john@example.com",
        "name": "John Doe",
        "is_active": true,
        "user_type": "regular",
        "last_login": "2025-01-15T10:30:00Z",
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-15T10:30:00Z",
        "roles": ["editor", "analyst"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### Get User Details
```http
GET /api/users/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "is_active": true,
    "user_type": "regular",
    "last_login": "2025-01-15T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-15T10:30:00Z",
    "roles": [
      {
        "id": "role-uuid",
        "name": "editor",
        "display_name": "Editor",
        "assigned_at": "2025-01-01T00:00:00Z",
        "expires_at": null
      }
    ],
    "permissions": [
      "user.read",
      "dashboard.create",
      "dashboard.update"
    ]
  }
}
```

### Create User
```http
POST /api/users
```

**Required Permissions:** `user.create`

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "name": "John Doe",
  "user_type": "regular",
  "roles": ["editor"] // Optional: assign roles during creation
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "name": "John Doe",
    "is_active": true,
    "user_type": "regular",
    "created_at": "2025-01-15T12:00:00Z"
  },
  "message": "User created successfully"
}
```

### Update User
```http
PUT /api/users/{id}
```

**Required Permissions:** `user.update` or resource ownership

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "email": "john.updated@example.com",
  "user_type": "premium"
}
```

### Deactivate User
```http
PATCH /api/users/{id}/deactivate
```

**Required Permissions:** `user.update` or `user.admin`

### Reactivate User
```http
PATCH /api/users/{id}/reactivate
```

**Required Permissions:** `user.update` or `user.admin`

### Delete User
```http
DELETE /api/users/{id}
```

**Required Permissions:** `user.delete`

### Search Users
```http
GET /api/users/search?q={query}
```

**Query Parameters:**
- `q`: Search term (name, email, username)
- `limit`: Results limit (default: 10)

### Get User Permissions
```http
GET /api/users/{id}/permissions
```

**Required Permissions:** `user.read` or resource ownership

---

## 2. Roles API (`/api/roles`)

### List Workspace Roles
```http
GET /api/roles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "workspace_admin",
      "display_name": "Workspace Administrator",
      "description": "Full workspace management access",
      "permissions": [
        "workspace.read",
        "workspace.update",
        "user.create",
        "user.update"
      ],
      "is_system": true,
      "level": 90,
      "user_count": 5,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Get Role Details
```http
GET /api/roles/{id}
```

### Create Custom Role
```http
POST /api/roles
```

**Required Permissions:** `role.create`

**Request Body:**
```json
{
  "name": "custom_analyst",
  "display_name": "Custom Analyst",
  "description": "Custom role for data analysis",
  "permissions": [
    "dashboard.read",
    "dashboard.create",
    "datasource.read"
  ]
}
```

### Update Role
```http
PUT /api/roles/{id}
```

**Required Permissions:** `role.update`

**Note:** System roles cannot be modified

### Delete Role
```http
DELETE /api/roles/{id}
```

**Required Permissions:** `role.delete`

**Note:** System roles cannot be deleted, roles with active assignments cannot be deleted

### Assign Role to User
```http
POST /api/roles/{roleId}/assign
```

**Required Permissions:** `role.assign`

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "expires_at": "2025-12-31T23:59:59Z" // Optional expiration
}
```

### Remove Role Assignment
```http
DELETE /api/roles/{roleId}/assignments/{userId}
```

**Required Permissions:** `role.assign`

### Bulk Assign Roles
```http
POST /api/roles/bulk-assign
```

**Required Permissions:** `role.assign`

**Request Body:**
```json
{
  "user_ids": ["user1-uuid", "user2-uuid"],
  "role_ids": ["role1-uuid", "role2-uuid"],
  "expires_at": "2025-12-31T23:59:59Z" // Optional
}
```

### Get Assignment Statistics
```http
GET /api/roles/assignments/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_assignments": 150,
    "active_assignments": 145,
    "expired_assignments": 5,
    "roles_breakdown": [
      {
        "role_name": "editor",
        "assignment_count": 45,
        "active_count": 43
      }
    ]
  }
}
```

---

## 3. Permissions API (`/api/permissions`)

### List All Permissions
```http
GET /api/permissions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "user.create",
      "display_name": "Create Users",
      "description": "Create new user accounts",
      "category": "User Management",
      "resource_type": "user",
      "action": "create",
      "is_system": true
    }
  ]
}
```

### Get Permissions by Category
```http
GET /api/permissions/categories
```

**Response:**
```json
{
  "success": true,
  "data": {
    "Workspace Management": [
      {
        "name": "workspace.read",
        "display_name": "View Workspace",
        "description": "View workspace information and settings"
      }
    ],
    "User Management": [
      {
        "name": "user.create",
        "display_name": "Create Users",
        "description": "Create new user accounts"
      }
    ]
  }
}
```

### Get Role Permission Assignments
```http
GET /api/permissions/{roleId}/assignments
```

**Required Permissions:** `role.read`

### Assign Permission to Role
```http
POST /api/permissions/{roleId}/assign
```

**Required Permissions:** `role.update`

**Request Body:**
```json
{
  "permission_id": "user.create"
}
```

### Remove Permission from Role
```http
DELETE /api/permissions/{roleId}/{permissionId}
```

**Required Permissions:** `role.update`

### Bulk Assign Permissions
```http
POST /api/permissions/bulk-assign
```

**Required Permissions:** `role.update`

**Request Body:**
```json
{
  "role_id": "role-uuid",
  "permission_ids": [
    "user.create",
    "user.update",
    "dashboard.read"
  ]
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable error message",
  "details": {
    "field": "Specific field error"
  }
}
```

### Common Error Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request data |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `VALIDATION_ERROR` | Validation failed |
| 500 | `INTERNAL_ERROR` | Server error |

### RBAC-Specific Errors

| Error Code | Description |
|------------|-------------|
| `INVALID_PERMISSION` | Permission doesn't exist |
| `ROLE_NOT_FOUND` | Role doesn't exist |
| `SYSTEM_ROLE_IMMUTABLE` | Cannot modify system role |
| `ROLE_HAS_ASSIGNMENTS` | Cannot delete role with active assignments |
| `PERMISSION_ALREADY_ASSIGNED` | Permission already assigned to role |
| `ROLE_ASSIGNMENT_EXISTS` | User already has this role |

---

## System Permissions Reference

### Workspace Management
- `workspace.read` - View workspace information
- `workspace.create` - Create new workspaces
- `workspace.update` - Update workspace settings
- `workspace.delete` - Delete workspaces
- `workspace.admin` - Full workspace administration

### User Management
- `user.read` - View user information
- `user.create` - Create new users
- `user.update` - Update user profiles
- `user.delete` - Delete users
- `user.invite` - Invite users to workspace

### Role Management
- `role.read` - View roles and assignments
- `role.create` - Create custom roles
- `role.update` - Update role permissions
- `role.delete` - Delete custom roles
- `role.assign` - Assign/remove roles from users

### Dashboard Management
- `dashboard.read` - View dashboards
- `dashboard.create` - Create dashboards
- `dashboard.update` - Update dashboards
- `dashboard.delete` - Delete dashboards
- `dashboard.share` - Share dashboards

### Data Source Management
- `datasource.read` - View data sources
- `datasource.create` - Create data sources
- `datasource.update` - Update data sources
- `datasource.delete` - Delete data sources
- `datasource.test` - Test data source connections
