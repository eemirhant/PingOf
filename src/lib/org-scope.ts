/**
 * Organization-scoped query helpers.
 * Every data access for org-bound resources MUST include organizationId.
 */

export type OrgScopedWhere = {
  organizationId: string;
};

export function withOrgScope<T extends Record<string, unknown>>(
  organizationId: string,
  where: T = {} as T,
): T & OrgScopedWhere {
  return {
    ...where,
    organizationId,
  };
}
