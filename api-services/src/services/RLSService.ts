// File: api-services/src/services/RLSService.ts

import { Pool } from 'pg';

export interface RLSPolicy {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  level: 'workspace' | 'group' | 'user' | 'dashboard' | 'chart' | 'webview';
  target_id?: string;
  dataset_ids: string[];
  policy_expression: string;
  context_variables: any;
  priority: number;
  is_active: boolean;
  performance_hint: any;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserContext {
  user_id: string;
  workspace_id: string;
  roles: string[];
  groups: string[];
  department?: string;
  region?: string;
  level?: string;
  [key: string]: any;
}

export class RLSService {
  constructor(private db: Pool) {}

  async applyRLSToQuery(
    baseQuery: string,
    userContext: UserContext,
    datasetIds: string[]
  ): Promise<string> {
    // Get applicable RLS policies
    const policies = await this.getApplicablePolicies(
      userContext.workspace_id,
      datasetIds,
      userContext.user_id
    );

    if (policies.length === 0) {
      return baseQuery;
    }

    let modifiedQuery = baseQuery;

    // Apply policies in priority order (highest priority first)
    for (const policy of policies.sort((a, b) => b.priority - a.priority)) {
      const rlsFilter = this.substituteContextVariables(
        policy.policy_expression,
        userContext
      );

      // Wrap query with RLS filter
      modifiedQuery = `
        SELECT * FROM (${modifiedQuery}) rls_base 
        WHERE ${rlsFilter}
      `;
    }

    return modifiedQuery;
  }

  private async getApplicablePolicies(
    workspaceId: string,
    datasetIds: string[],
    userId: string
  ): Promise<RLSPolicy[]> {
    const query = `
      SELECT * FROM rls_policies 
      WHERE workspace_id = $1 
      AND is_active = true
      AND (
        dataset_ids && $2::uuid[] OR
        dataset_ids IS NULL OR
        array_length(dataset_ids, 1) IS NULL
      )
      ORDER BY priority DESC
    `;

    const result = await this.db.query(query, [workspaceId, datasetIds]);
    return result.rows;
  }

  private substituteContextVariables(expression: string, context: UserContext): string {
    let substituted = expression;

    Object.keys(context).forEach(key => {
      const placeholder = `{${key}}`;
      const value = context[key];
      
      if (Array.isArray(value)) {
        // Handle arrays (e.g., roles, groups)
        const arrayValue = value.map(v => `'${v}'`).join(',');
        substituted = substituted.replace(
          new RegExp(`\\$\\{${key}\\}`, 'g'),
          `(${arrayValue})`
        );
      } else {
        // Handle single values
        substituted = substituted.replace(
          new RegExp(`\\{${key}\\}`, 'g'),
          `'${value}'`
        );
      }
    });

    return substituted;
  }

  async createRLSPolicy(policyData: Partial<RLSPolicy>): Promise<RLSPolicy> {
    const query = `
      INSERT INTO rls_policies 
      (workspace_id, name, description, level, target_id, dataset_ids, 
       policy_expression, context_variables, priority, performance_hint, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      policyData.workspace_id,
      policyData.name,
      policyData.description,
      policyData.level,
      policyData.target_id,
      policyData.dataset_ids,
      policyData.policy_expression,
      JSON.stringify(policyData.context_variables || {}),
      policyData.priority || 0,
      JSON.stringify(policyData.performance_hint || {}),
      policyData.created_by
    ]);

    return result.rows[0];
  }

  async updateRLSPolicy(
    policyId: string,
    policyData: Partial<RLSPolicy>
  ): Promise<RLSPolicy> {
    const query = `
      UPDATE rls_policies 
      SET 
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        policy_expression = COALESCE($4, policy_expression),
        context_variables = COALESCE($5, context_variables),
        priority = COALESCE($6, priority),
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [
      policyId,
      policyData.name,
      policyData.description,
      policyData.policy_expression,
      policyData.context_variables ? JSON.stringify(policyData.context_variables) : null,
      policyData.priority,
      policyData.is_active
    ]);

    return result.rows[0];
  }

  async deleteRLSPolicy(policyId: string): Promise<boolean> {
    const query = 'DELETE FROM rls_policies WHERE id = $1';
    const result = await this.db.query(query, [policyId]);
    return result.rowCount > 0;
  }

  async getUserContext(userId: string, workspaceId: string): Promise<UserContext> {
    const query = `
      SELECT 
        u.id as user_id,
        u.profile_data,
        w.id as workspace_id,
        array_agg(DISTINCT cr.name) as roles,
        COALESCE(u.profile_data->>'department', '') as department,
        COALESCE(u.profile_data->>'region', '') as region,
        COALESCE(u.profile_data->>'level', '') as level
      FROM users u
      CROSS JOIN workspaces w
      LEFT JOIN user_roles ura ON u.id = ura.user_id AND w.id = ura.workspace_id
      LEFT JOIN roles cr ON ura.role_id = cr.id
      WHERE u.id = $1 AND w.id = $2 AND ura.is_active = true
      GROUP BY u.id, u.profile_data, w.id
    `;

    const result = await this.db.query(query, [userId, workspaceId]);
    
    if (result.rows.length === 0) {
      throw new Error('User context not found');
    }

    const row = result.rows[0];
    return {
      user_id: row.user_id,
      workspace_id: row.workspace_id,
      roles: row.roles || [],
      groups: [], // Would need additional groups table
      department: row.department,
      region: row.region,
      level: row.level,
      ...row.profile_data
    };
  }
}