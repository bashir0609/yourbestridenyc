import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload';
import { adminField, adminOrSelf, hasRole, isAdmin, roles, staffAccess } from '../access';

export const protectUserCreation: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
  originalDoc,
}) => {
  if (hasRole(req.user, ['admin'])) return data;

  if (operation === 'create') {
    // Payload's register-first-user operation intentionally uses overrideAccess.
    if (!req.user && process.env.CMS_ALLOW_FIRST_USER === 'true') {
      const existing = await req.payload.count({ collection: 'users', overrideAccess: true, req });
      if (existing.totalDocs === 0) return { ...data, role: 'admin' };
    }
    throw new APIError(
      'Only administrators may create users. Initial setup is disabled or already complete.',
      403,
    );
  }

  if (data.role !== undefined && data.role !== originalDoc?.role) {
    throw new APIError('Only administrators may change roles.', 403);
  }
  return data;
};

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Administration',
    defaultColumns: ['email', 'name', 'role'],
  },
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  access: {
    admin: staffAccess,
    create: isAdmin,
    read: adminOrSelf,
    update: adminOrSelf,
    delete: isAdmin,
    unlock: isAdmin,
  },
  hooks: { beforeChange: [protectUserCreation] },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'content-manager',
      saveToJWT: true,
      options: roles.map((role) => ({
        label: {
          admin: 'Admin',
          'content-manager': 'Content Manager',
          'lead-manager': 'Lead Manager',
        }[role],
        value: role,
      })),
      access: { create: adminField, update: adminField },
    },
  ],
};
