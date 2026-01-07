import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.js';
import { env } from '../../env.js';
import { AdminRole } from '../../constants/admin-enums.js';

interface AdminTokenPayload {
  adminUserId: string;
  email: string;
  role: AdminRole;
  permissions: string[];
}

export class AdminAuthService {
  /**
   * Generate admin JWT token with role and permissions
   */
  static generateAdminToken(
    adminUserId: string,
    email: string,
    role: AdminRole,
    permissions: string[]
  ): string {
    const payload: AdminTokenPayload = {
      adminUserId,
      email,
      role,
      permissions,
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '8h', // Admin sessions last 8 hours
    });
  }

  /**
   * Verify admin credentials and return admin user with permissions
   */
  static async loginAdmin(email: string, password: string) {
    console.log('[admin-auth] login attempt', { email });
    // Find admin user
    const admin = await prisma.admin_users.findUnique({
      where: { email },
      include: {
        admin_permissions: true,
      },
    });

    if (!admin) {
      console.warn('[admin-auth] admin not found', { email });
      throw new Error('Invalid credentials');
    }

    if (!admin.is_active) {
      console.warn('[admin-auth] admin inactive', { email, adminId: admin.id });
      throw new Error('Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      console.warn('[admin-auth] invalid password', { email, adminId: admin.id });
      throw new Error('Invalid credentials');
    }

    // Extract permissions
    const permissions = admin.admin_permissions.map(p => p.permission_key);

    // Generate token
    const role = admin.role as AdminRole;
    const token = this.generateAdminToken(admin.id, admin.email, role, permissions);

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions,
      },
    };
  }

  /**
   * Get admin user with permissions by ID
   */
  static async getAdminById(adminId: string) {
    const admin = await prisma.admin_users.findUnique({
      where: { id: adminId },
      include: {
        admin_permissions: true,
      },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role as AdminRole,
      is_active: admin.is_active,
      permissions: admin.admin_permissions.map(p => p.permission_key),
      created_at: admin.created_at,
    };
  }
}
