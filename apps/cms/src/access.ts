import type { Access, FieldAccess } from 'payload';

export const roles = ['admin', 'content-manager', 'lead-manager'] as const;
export type Role = (typeof roles)[number];

type Actor = { id: string | number; role?: unknown; collection?: string } | null | undefined;

export function hasRole(user: Actor, allowed: readonly Role[]): boolean {
  return Boolean(user && user.collection === 'users' && allowed.includes(user.role as Role));
}

export const isAdmin = (({ req }) => hasRole(req.user, ['admin'])) satisfies Access;
export const adminField: FieldAccess = ({ req }) => hasRole(req.user, ['admin']);
export const editorialWrite = (({ req }) =>
  hasRole(req.user, ['admin', 'content-manager'])) satisfies Access;
export const intakeAccess = (({ req }) =>
  hasRole(req.user, ['admin', 'lead-manager'])) satisfies Access;
export const staffAccess = (({ req }) => hasRole(req.user, roles)) satisfies Access;
export const publicRead = (() => true) satisfies Access;

export const editorialRead: Access = ({ req }) => {
  if (hasRole(req.user, ['admin', 'content-manager'])) return true;
  return { _status: { equals: 'published' } };
};

export const adminOrSelf: Access = ({ req }) => {
  if (hasRole(req.user, ['admin'])) return true;
  if (!hasRole(req.user, roles)) return false;
  return { id: { equals: req.user!.id } };
};
