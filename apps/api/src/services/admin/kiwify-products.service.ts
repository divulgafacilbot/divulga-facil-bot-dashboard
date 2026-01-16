import { prisma } from '../../db/prisma.js';
import type { KiwifyProductKind } from '@prisma/client';

export interface KiwifyProductData {
  product_id: string;
  product_name?: string | null;
  kind: KiwifyProductKind;
  plan_id?: string | null;
  bot_type?: string | null;
  quantity?: number;
}

export class KiwifyProductsService {
  /**
   * Get product mapping by Kiwify product ID
   */
  static async getProductMapping(productId: string) {
    return prisma.kiwify_products.findUnique({
      where: { product_id: productId },
      include: { plan: true },
    });
  }

  /**
   * Get product mapping by product name (fuzzy match)
   * Useful when Kiwify payload contains product name but not the internal ID
   */
  static async getProductMappingByName(productName: string) {
    return prisma.kiwify_products.findFirst({
      where: {
        product_name: {
          contains: productName,
          mode: 'insensitive',
        },
      },
      include: { plan: true },
    });
  }

  /**
   * Create a new product mapping
   */
  static async createMapping(data: KiwifyProductData) {
    return prisma.kiwify_products.create({
      data: {
        product_id: data.product_id,
        product_name: data.product_name,
        kind: data.kind,
        plan_id: data.plan_id,
        bot_type: data.bot_type,
        quantity: data.quantity ?? 1,
      },
      include: { plan: true },
    });
  }

  /**
   * Update a product mapping
   */
  static async updateMapping(id: string, data: Partial<KiwifyProductData>) {
    return prisma.kiwify_products.update({
      where: { id },
      data: {
        product_id: data.product_id,
        product_name: data.product_name,
        kind: data.kind,
        plan_id: data.plan_id,
        bot_type: data.bot_type,
        quantity: data.quantity,
      },
      include: { plan: true },
    });
  }

  /**
   * Delete a product mapping
   */
  static async deleteMapping(id: string) {
    return prisma.kiwify_products.delete({
      where: { id },
    });
  }

  /**
   * Get all product mappings
   */
  static async getAllMappings() {
    return prisma.kiwify_products.findMany({
      include: { plan: true },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get mappings by kind
   */
  static async getMappingsByKind(kind: KiwifyProductKind) {
    return prisma.kiwify_products.findMany({
      where: { kind },
      include: { plan: true },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Check if a product ID is already mapped
   */
  static async productIdExists(productId: string): Promise<boolean> {
    const existing = await prisma.kiwify_products.findUnique({
      where: { product_id: productId },
      select: { id: true },
    });
    return !!existing;
  }
}
