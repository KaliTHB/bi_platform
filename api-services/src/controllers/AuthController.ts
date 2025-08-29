// File: api-services/src/services/AuthService.ts

import bcrypt from 'bcryptjs';
import { DatabaseService } from './DatabaseService';

export class AuthService extends DatabaseService {
  async authenticateUser(username: string, password: string) {
    const query = `
      SELECT id, username, email, password_hash, first_name, last_name, 
             avatar_url, is_active, created_at, updated_at
      FROM users 
      WHERE (username = $1 OR email = $1) AND is_active = true
    `;
    
    const result = await this.query(query, [username]);
    const user = result.rows[0];

    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  async getUserById(userId: string) {
    const query = `
      SELECT id, username, email, first_name, last_name, 
             avatar_url, profile_data, is_active, last_login,
             created_at, updated_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.query(query, [userId]);
    return result.rows[0];
  }

  async getWorkspaceBySlug(slug: string) {
    const query = `
      SELECT id, name, display_name, description, slug, 
             branding_config, theme_config, is_active,
             created_at, updated_at
      FROM workspaces 
      WHERE slug = $1 AND is_active = true
    `;
    
    const result = await this.query(query, [slug]);
    return result.rows[0];
  }

  async getWorkspaceById(workspaceId: string) {
    const query = `
      SELECT id, name, display_name, description, slug, 
             branding_config, theme_config, is_active,
             created_at, updated_at
      FROM workspaces 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.query(query, [workspaceId]);
    return result.rows[0];
  }

  async checkUserWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM user_role_assignments ura
      JOIN custom_roles cr ON ura.role_id = cr.id
      WHERE ura.user_id = $1 
        AND ura.workspace_id = $2
        AND ura.is_active = true
        AND cr.is_active = true
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    `;
    
    const result = await this.query(query, [userId, workspaceId]);
    return result.rows.length > 0;
  }

  async updateLastLogin(userId: string) {
    const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await this.query(query, [userId]);
  }
}
