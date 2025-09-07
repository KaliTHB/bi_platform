# Types Directory Structure

This directory contains all TypeScript type definitions organized by domain/feature area.

## File Organization

```
types/
├── index.ts          # Main export file - import all types from here
├── api.ts            # API response structures and HTTP types
├── common.ts         # Shared utility types and base interfaces
├── dashboard.ts      # Dashboard, chart, dataset, and data source types
├── plugin.ts         # Plugin system and configuration types
├── system.ts         # System monitoring, health, and audit types
├── ui.ts            # UI components, forms, and interaction types
├── user.ts          # User, role, and permission types
├── webview.ts       # Webview panel and navigation types
├── workspace.ts     # Workspace and multi-tenant types
└── README.md        # This documentation
```

## Usage

### Import all types from the main index:
```typescript
import { User, Dashboard, ApiResponse } from '@/types';
```

### Import from specific files (if needed):
```typescript
import { SystemHealthData } from '@/types/system';
import { TableColumn } from '@/types/ui';
```

## Type Categories

### Base Types (`common.ts`)
- **BaseEntity**: Common fields for all entities (id, created_at, updated_at)
- **SoftDeleteEntity**: Entities with soft delete support
- **WorkspaceScopedEntity**: Multi-tenant workspace scoping
- **UserPreferences**: User settings and preferences
- **ValidationRule/Error**: Form validation types

### User Management (`user.ts`)
- **User**: User profile and authentication
- **Role**: Role definitions and permissions
- **Permission**: Granular permission system
- **UserRoleAssignment**: Many-to-many user-role relationships

### Workspace (`workspace.ts`)
- **Workspace**: Multi-tenant workspace container
- **WorkspaceSettings**: Workspace configuration
- **WorkspaceRole**: Workspace-specific role assignments

### Dashboard System (`dashboard.ts`)
- **Dashboard**: Dashboard layouts and configurations
- **Chart**: Chart definitions and visualizations
- **Dataset**: Data sources and transformations
- **DataSource**: Database connections and plugins
- **Category**: Dashboard organization and categorization

### Plugin System (`plugin.ts`)
- **DataSourcePlugin**: Data connection plugins
- **ChartPlugin**: Visualization plugins
- **PluginConfiguration**: Workspace-specific plugin settings
- **ConnectionTestResult**: Plugin testing and validation

### System Monitoring (`system.ts`)
- **SystemHealthData**: System performance metrics
- **ServiceStatus**: Individual service health
- **AuditLog**: Security and activity tracking
- **ExportJob**: Background export operations

### UI Components (`ui.ts`)
- **TableColumn**: Data table configurations
- **FormField**: Dynamic form generation
- **FilterOption**: Search and filtering
- **ModalProps**: Dialog and modal components
- **NotificationAction**: System notifications

### API Layer (`api.ts`)
- **ApiResponse**: Standardized API responses
- **PaginatedResponse**: List pagination
- **ApiError**: Error handling and validation
- **RequestConfig**: HTTP client configuration

### Webview System (`webview.ts`)
- **Webview**: Public dashboard panels
- **WebviewTheme**: Customizable themes and styling
- **WebviewNavigation**: Navigation and categorization
- **WebviewAccessControl**: Security and access control

## Type Conventions

### Naming Patterns
- **Interfaces**: PascalCase (e.g., `UserPreferences`)
- **Types**: PascalCase (e.g., `Theme`)
- **Properties**: snake_case for API fields, camelCase for frontend
- **Enums**: UPPER_SNAKE_CASE values

### Field Patterns
- **IDs**: Always `string` type
- **Timestamps**: ISO 8601 strings (`created_at`, `updated_at`)
- **Booleans**: Prefixed with `is_`, `has_`, `can_`, `should_`
- **Configuration**: `Record<string, any>` for flexible objects
- **Optional fields**: Use `?:` for truly optional properties

### Inheritance Patterns
- Extend `BaseEntity` for database entities
- Extend `WorkspaceScopedEntity` for multi-tenant resources
- Use composition over deep inheritance

## Best Practices

1. **Import from index**: Always import from the main types index
2. **Specific imports**: Only import directly from files when needed for performance
3. **Type reuse**: Prefer composition and utility types over duplication
4. **Documentation**: Add JSDoc comments for complex types
5. **Validation**: Use TypeScript's strict mode features
6. **API alignment**: Keep types aligned with backend API structure

## Adding New Types

When adding new types:

1. Determine the appropriate file based on domain
2. Follow existing naming conventions
3. Extend base interfaces when applicable
4. Add exports to the main `index.ts`
5. Document complex types with JSDoc
6. Consider backward compatibility

## Type Utilities

Common utility types provided:

```typescript
// Make specific fields optional
type PartialUser = Optional<User, 'avatar_url' | 'last_login'>;

// Make specific fields required
type RequiredConfig = RequiredFields<PluginConfig, 'name' | 'version'>;

// Deep partial for nested objects
type DeepPartialSettings = DeepPartial<WorkspaceSettings>;

// Generic CRUD operations
interface UserService extends CrudOperations<User, CreateUserRequest, UpdateUserRequest> {}
```