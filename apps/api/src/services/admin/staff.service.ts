import { prisma } from '../../db/prisma.js';
import bcrypt from 'bcrypt';
import { AdminRole } from '../../constants/admin-enums.js';

export class AdminStaffService {
  /**
   * Get all admin staff members
   */
  static async getAdminStaff(includeInactive = false) {
    const where: any = {};

    if (!includeInactive) {
      where.is_active = true;
    }

    const staff = await prisma.admin_users.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        admin_permissions: true,
      },
    });

    // Remove password hash from response
    return staff.map((admin) => {
      const { password_hash, admin_permissions, ...adminWithoutPassword } = admin;
      return {
        ...adminWithoutPassword,
        permissions: admin_permissions.map((permission) => permission.permission_key),
      };
    });
  }

  /**
   * Create a new admin user
   */
  static async createAdminUser(
    name: string,
    email: string,
    password: string,
    role: string | undefined,
    permissions: string[] = []
  ) {
    const normalizeRoleValue = (value?: string) =>
      value && Object.values(AdminRole).includes(value as AdminRole)
        ? (value as AdminRole)
        : AdminRole.COLABORADOR;
    const normalizedRole = normalizeRoleValue(role);
    const normalizedPermissions =
      normalizedRole === AdminRole.ADMIN_MASTER ? [] : permissions;

    // Check if email already exists
    const existingAdmin = await prisma.admin_users.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      if (!existingAdmin.is_active) {
        const password_hash = await bcrypt.hash(password, 10);

        const updatedAdmin = await prisma.admin_users.update({
          where: { id: existingAdmin.id },
          data: {
            name,
            password_hash,
            role: normalizedRole,
            is_active: true,
          },
        });

        await prisma.admin_permissions.deleteMany({
          where: { admin_user_id: existingAdmin.id },
        });

        if (normalizedPermissions.length > 0) {
          await prisma.admin_permissions.createMany({
            data: normalizedPermissions.map((permission_key) => ({
              admin_user_id: existingAdmin.id,
              permission_key,
            })),
          });
        }

        const completeAdminUser = await prisma.admin_users.findUnique({
          where: { id: existingAdmin.id },
          include: {
            admin_permissions: true,
          },
        });

        if (completeAdminUser) {
          const { password_hash: _passwordHash, admin_permissions, ...adminWithoutPassword } = completeAdminUser;
          return {
            ...adminWithoutPassword,
            permissions: admin_permissions.map((permission) => permission.permission_key),
          };
        }
      }

      throw new Error('Admin user with this email already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = await prisma.admin_users.create({
      data: {
        name,
        email,
        password_hash,
        role: normalizedRole,
      },
    });

    // Create permissions
    if (normalizedPermissions.length > 0) {
      await prisma.admin_permissions.createMany({
        data: normalizedPermissions.map((permission_key) => ({
          admin_user_id: adminUser.id,
          permission_key,
        })),
      });
    }

    // Fetch and return complete admin user
    const completeAdminUser = await prisma.admin_users.findUnique({
      where: { id: adminUser.id },
      include: {
        admin_permissions: true,
      },
    });

    // Remove password hash
    if (completeAdminUser) {
      const { password_hash, admin_permissions, ...adminWithoutPassword } = completeAdminUser;
      return {
        ...adminWithoutPassword,
        permissions: admin_permissions.map((permission) => permission.permission_key),
      };
    }

    return null;
  }

  /**
   * Update admin user permissions
   */
  static async updateAdminPermissions(
    adminUserId: string,
    permissions: string[]
  ) {
    // Delete existing permissions
    await prisma.admin_permissions.deleteMany({
      where: { admin_user_id: adminUserId },
    });

    // Create new permissions
    if (permissions.length > 0) {
      await prisma.admin_permissions.createMany({
        data: permissions.map((permission_key) => ({
          admin_user_id: adminUserId,
          permission_key,
        })),
      });
    }

    // Fetch and return updated admin user
    const adminUser = await prisma.admin_users.findUnique({
      where: { id: adminUserId },
      include: {
        admin_permissions: true,
      },
    });

    if (adminUser) {
      const { password_hash, admin_permissions, ...adminWithoutPassword } = adminUser;
      return {
        ...adminWithoutPassword,
        permissions: admin_permissions.map((permission) => permission.permission_key),
      };
    }

    return null;
  }

  /**
   * Deactivate an admin user
   */
  static async deactivateAdminUser(adminUserId: string) {
    const adminUser = await prisma.admin_users.update({
      where: { id: adminUserId },
      data: { is_active: false },
    });

    const { password_hash, ...adminWithoutPassword } = adminUser;
    return adminWithoutPassword;
  }

  /**
   * Reactivate an admin user
   */
  static async reactivateAdminUser(adminUserId: string) {
    const adminUser = await prisma.admin_users.update({
      where: { id: adminUserId },
      data: { is_active: true },
    });

    const { password_hash, ...adminWithoutPassword } = adminUser;
    return adminWithoutPassword;
  }

  /**
   * Delete an admin user
   */
  static async deleteAdminUser(adminUserId: string) {
    const adminUser = await prisma.admin_users.delete({
      where: { id: adminUserId },
    });

    const { password_hash, ...adminWithoutPassword } = adminUser;
    return adminWithoutPassword;
  }
}
