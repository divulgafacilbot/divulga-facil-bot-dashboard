import { prisma } from '../../db/prisma.js';
import bcrypt from 'bcrypt';

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
      const { password_hash, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });
  }

  /**
   * Create a new admin user
   */
  static async createAdminUser(
    name: string,
    email: string,
    password: string,
    role: string,
    permissions: string[]
  ) {
    // Check if email already exists
    const existingAdmin = await prisma.admin_users.findUnique({
      where: { email },
    });

    if (existingAdmin) {
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
        role,
      },
    });

    // Create permissions
    if (permissions.length > 0) {
      await prisma.admin_permissions.createMany({
        data: permissions.map((permission_key) => ({
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
      const { password_hash, ...adminWithoutPassword } = completeAdminUser;
      return adminWithoutPassword;
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
      const { password_hash, ...adminWithoutPassword } = adminUser;
      return adminWithoutPassword;
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
}
