import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CampaignService } from '../../src/services/admin/campaign.service';
import {
  uploadFile,
  getAssetsByCampaignId,
  deleteAsset,
} from '../../src/services/admin/campaign-asset.service';
import { generateCampaignZip } from '../../src/services/admin/zip-generator.service';
import { UserCampaignsService } from '../../src/services/user/campaigns.service';
import type {
  CampaignWithAssets,
  CampaignListResponse,
  CreateCampaignPayload,
  CampaignAssetType,
} from '../../src/types/campaign.types';

// Mock Prisma client
vi.mock('../../src/db/prisma.js', () => ({
  prisma: {
    campaigns: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    campaign_assets: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    campaign_downloads: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock fs (synchronous)
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    createReadStream: vi.fn(),
  },
}));

// Mock archiver
vi.mock('archiver', () => ({
  default: vi.fn(() => ({
    file: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn(),
  })),
}));

import { prisma } from '../../src/db/prisma.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import archiver from 'archiver';

describe('CampaignService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCampaign', () => {
    it('should create campaign with assets successfully', async () => {
      const mockPayload: CreateCampaignPayload = {
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
      };

      const mockCampaign = {
        id: 'campaign-1',
        name: mockPayload.name,
        price: mockPayload.price,
        product_url: mockPayload.product_url,
        main_video_url: mockPayload.main_video_url,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockAssets = [
        {
          id: 'asset-1',
          campaign_id: 'campaign-1',
          asset_url: '/uploads/campaigns/image1.jpg',
          asset_type: 'image',
          created_at: new Date(),
        },
        {
          id: 'asset-2',
          campaign_id: 'campaign-1',
          asset_url: '/uploads/campaigns/image2.jpg',
          asset_type: 'image',
          created_at: new Date(),
        },
      ];

      const mockTransaction = vi.fn(async (callback) => {
        const mockTx = {
          campaigns: {
            create: vi.fn().mockResolvedValue(mockCampaign),
          },
          campaign_assets: {
            create: vi.fn()
              .mockResolvedValueOnce(mockAssets[0])
              .mockResolvedValueOnce(mockAssets[1]),
          },
        };
        return callback(mockTx);
      });

      (prisma.$transaction as any) = mockTransaction;

      const result = await CampaignService.createCampaign(
        mockPayload,
        mockPayload.main_video_url,
        [
          { url: '/uploads/campaigns/image1.jpg', type: 'image' as CampaignAssetType },
          { url: '/uploads/campaigns/image2.jpg', type: 'image' as CampaignAssetType },
        ]
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('campaign-1');
      expect(result.name).toBe('Test Campaign');
      expect(result.price).toBe(99.99);
      expect(result.assets).toHaveLength(2);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const mockPayload: CreateCampaignPayload = {
        name: '',
        price: -1,
        product_url: '',
        main_video_url: '',
      };

      const mockTransaction = vi.fn().mockRejectedValue(new Error('Validation failed'));
      (prisma.$transaction as any) = mockTransaction;

      await expect(
        CampaignService.createCampaign(mockPayload, '', [])
      ).rejects.toThrow('Failed to create campaign');
    });

    it('should handle database errors', async () => {
      const mockPayload: CreateCampaignPayload = {
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
      };

      const mockTransaction = vi.fn().mockRejectedValue(new Error('Database connection failed'));
      (prisma.$transaction as any) = mockTransaction;

      await expect(
        CampaignService.createCampaign(mockPayload, mockPayload.main_video_url, [])
      ).rejects.toThrow('Failed to create campaign');
    });
  });

  describe('listCampaigns', () => {
    it('should return empty list when no campaigns exist', async () => {
      (prisma.campaigns.findMany as any).mockResolvedValue([]);
      (prisma.campaigns.count as any).mockResolvedValue(0);

      const result = await CampaignService.listCampaigns();

      expect(result.campaigns).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter campaigns by search term', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Summer Sale Campaign',
          price: 49.99,
          product_url: 'https://example.com/summer',
          main_video_url: '/uploads/campaigns/summer.mp4',
          created_at: new Date(),
          updated_at: new Date(),
          _count: { campaign_assets: 5 },
        },
      ];

      (prisma.campaigns.findMany as any).mockResolvedValue(mockCampaigns);
      (prisma.campaigns.count as any).mockResolvedValue(1);

      const result = await CampaignService.listCampaigns({
        search: 'Summer',
      });

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].name).toBe('Summer Sale Campaign');
      expect(result.total).toBe(1);
      expect(prisma.campaigns.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'Summer', mode: 'insensitive' } },
              { product_url: { contains: 'Summer', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should apply pagination correctly', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Campaign 1',
          price: 49.99,
          product_url: 'https://example.com/1',
          main_video_url: '/uploads/campaigns/1.mp4',
          created_at: new Date(),
          updated_at: new Date(),
          _count: { campaign_assets: 3 },
        },
      ];

      (prisma.campaigns.findMany as any).mockResolvedValue(mockCampaigns);
      (prisma.campaigns.count as any).mockResolvedValue(25);

      const result = await CampaignService.listCampaigns({
        page: 3,
        limit: 10,
      });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(prisma.campaigns.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });

    it('should sort campaigns by different fields', async () => {
      (prisma.campaigns.findMany as any).mockResolvedValue([]);
      (prisma.campaigns.count as any).mockResolvedValue(0);

      await CampaignService.listCampaigns({
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(prisma.campaigns.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );

      await CampaignService.listCampaigns({
        sortBy: 'price',
        sortOrder: 'desc',
      });

      expect(prisma.campaigns.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'desc' },
        })
      );
    });
  });

  describe('getCampaignById', () => {
    it('should return campaign when found', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [
          {
            id: 'asset-1',
            campaign_id: 'campaign-1',
            asset_url: '/uploads/campaigns/image1.jpg',
            asset_type: 'image',
            created_at: new Date(),
          },
        ],
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);

      const result = await CampaignService.getCampaignById('campaign-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('campaign-1');
      expect(result?.assets).toHaveLength(1);
      expect(prisma.campaigns.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'campaign-1' },
          include: {
            campaign_assets: {
              orderBy: {
                created_at: 'asc',
              },
            },
          },
        })
      );
    });

    it('should return null when campaign not found', async () => {
      (prisma.campaigns.findUnique as any).mockResolvedValue(null);

      const result = await CampaignService.getCampaignById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign successfully', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (prisma.campaigns.delete as any).mockResolvedValue(mockCampaign);

      await CampaignService.deleteCampaign('campaign-1');

      expect(prisma.campaigns.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
      expect(prisma.campaigns.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-1' },
      });
    });

    it('should throw error when campaign not found', async () => {
      (prisma.campaigns.findUnique as any).mockResolvedValue(null);

      await expect(CampaignService.deleteCampaign('non-existent')).rejects.toThrow(
        'Campaign not found'
      );
    });
  });

  describe('getCampaignStats', () => {
    it('should return correct statistics', async () => {
      (prisma.campaigns.count as any).mockResolvedValue(10);
      (prisma.campaign_assets.count as any).mockResolvedValue(50);
      (prisma.campaign_downloads.count as any).mockResolvedValue(100);

      const result = await CampaignService.getCampaignStats();

      expect(result).toEqual({
        total_campaigns: 10,
        total_assets: 50,
        total_downloads: 100,
        avg_assets_per_campaign: 5,
      });
    });

    it('should handle zero campaigns', async () => {
      (prisma.campaigns.count as any).mockResolvedValue(0);
      (prisma.campaign_assets.count as any).mockResolvedValue(0);
      (prisma.campaign_downloads.count as any).mockResolvedValue(0);

      const result = await CampaignService.getCampaignStats();

      expect(result).toEqual({
        total_campaigns: 0,
        total_assets: 0,
        total_downloads: 0,
        avg_assets_per_campaign: 0,
      });
    });
  });
});

describe('Campaign Asset Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = {
        originalname: 'test-image.jpg',
        buffer: Buffer.from('test-content'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result = await uploadFile(mockFile, 'campaigns');

      expect(result).toBeDefined();
      expect(result.url).toMatch(/^\/uploads\/campaigns\/.+\.jpg$/);
      expect(result.path).toContain('uploads/campaigns');
      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/campaigns'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      await uploadFile(mockFile, 'new-folder');

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/new-folder'),
        { recursive: true }
      );
    });

    it('should generate unique filename with timestamp', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      (fs.mkdir as any).mockResolvedValue(undefined);
      (fs.writeFile as any).mockResolvedValue(undefined);

      const result1 = await uploadFile(mockFile, 'campaigns');
      const result2 = await uploadFile(mockFile, 'campaigns');

      expect(result1.url).not.toBe(result2.url);
    });

    it('should handle upload errors', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      (fs.mkdir as any).mockRejectedValue(new Error('Permission denied'));

      await expect(uploadFile(mockFile, 'campaigns')).rejects.toThrow(
        'Failed to upload file'
      );
    });
  });

  describe('getAssetsByCampaignId', () => {
    it('should return assets for campaign', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          campaign_id: 'campaign-1',
          asset_url: '/uploads/campaigns/image1.jpg',
          asset_type: 'image',
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'asset-2',
          campaign_id: 'campaign-1',
          asset_url: '/uploads/campaigns/image2.jpg',
          asset_type: 'image',
          created_at: new Date('2024-01-02'),
        },
      ];

      (prisma.campaign_assets.findMany as any).mockResolvedValue(mockAssets);

      const result = await getAssetsByCampaignId('campaign-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('asset-1');
      expect(prisma.campaign_assets.findMany).toHaveBeenCalledWith({
        where: { campaign_id: 'campaign-1' },
        orderBy: { created_at: 'asc' },
      });
    });

    it('should return empty array when no assets exist', async () => {
      (prisma.campaign_assets.findMany as any).mockResolvedValue([]);

      const result = await getAssetsByCampaignId('campaign-1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset and file successfully', async () => {
      const mockAsset = {
        id: 'asset-1',
        campaign_id: 'campaign-1',
        asset_url: '/uploads/campaigns/image.jpg',
        asset_type: 'image',
        created_at: new Date(),
      };

      (prisma.campaign_assets.findUnique as any).mockResolvedValue(mockAsset);
      (prisma.campaign_assets.delete as any).mockResolvedValue(mockAsset);
      (fs.unlink as any).mockResolvedValue(undefined);

      await deleteAsset('asset-1');

      expect(prisma.campaign_assets.findUnique).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
      });
      expect(prisma.campaign_assets.delete).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
      });
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should handle file cleanup errors gracefully', async () => {
      const mockAsset = {
        id: 'asset-1',
        campaign_id: 'campaign-1',
        asset_url: '/uploads/campaigns/image.jpg',
        asset_type: 'image',
        created_at: new Date(),
      };

      (prisma.campaign_assets.findUnique as any).mockResolvedValue(mockAsset);
      (prisma.campaign_assets.delete as any).mockResolvedValue(mockAsset);
      (fs.unlink as any).mockRejectedValue(new Error('File not found'));

      // Should not throw even if file deletion fails
      await expect(deleteAsset('asset-1')).resolves.not.toThrow();
    });

    it('should throw error when asset not found', async () => {
      (prisma.campaign_assets.findUnique as any).mockResolvedValue(null);

      await expect(deleteAsset('non-existent')).rejects.toThrow('Asset not found');
    });
  });
});

describe('ZIP Generator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCampaignZip', () => {
    it('should create valid ZIP with all files', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [
          {
            id: 'asset-1',
            campaign_id: 'campaign-1',
            asset_url: '/uploads/campaigns/image1.jpg',
            asset_type: 'image',
            created_at: new Date(),
          },
          {
            id: 'asset-2',
            campaign_id: 'campaign-1',
            asset_url: '/uploads/campaigns/image2.jpg',
            asset_type: 'image',
            created_at: new Date(),
          },
        ],
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (fsSync.existsSync as any).mockReturnValue(true);

      const mockArchive = {
        file: vi.fn(),
        append: vi.fn(),
        finalize: vi.fn(),
      };
      (archiver as any).mockReturnValue(mockArchive);

      const result = await generateCampaignZip('campaign-1');

      expect(result).toBeDefined();
      expect(result.filename).toBe('test-campaign.zip');
      expect(result.stream).toBeDefined();
      expect(mockArchive.file).toHaveBeenCalledTimes(3); // main video + 2 assets
      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('Product Link:'),
        { name: 'README.txt' }
      );
      expect(mockArchive.finalize).toHaveBeenCalled();
    });

    it('should include README with product URL', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [],
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (fsSync.existsSync as any).mockReturnValue(true);

      const mockArchive = {
        file: vi.fn(),
        append: vi.fn(),
        finalize: vi.fn(),
      };
      (archiver as any).mockReturnValue(mockArchive);

      await generateCampaignZip('campaign-1');

      expect(mockArchive.append).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/product'),
        { name: 'README.txt' }
      );
    });

    it('should handle missing files gracefully', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [
          {
            id: 'asset-1',
            campaign_id: 'campaign-1',
            asset_url: '/uploads/campaigns/missing.jpg',
            asset_type: 'image',
            created_at: new Date(),
          },
        ],
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (fsSync.existsSync as any)
        .mockReturnValueOnce(true) // main video exists
        .mockReturnValueOnce(false); // asset missing

      const mockArchive = {
        file: vi.fn(),
        append: vi.fn(),
        finalize: vi.fn(),
      };
      (archiver as any).mockReturnValue(mockArchive);

      const result = await generateCampaignZip('campaign-1');

      expect(mockArchive.file).toHaveBeenCalledTimes(1); // Only main video
      expect(result.filename).toBe('test-campaign.zip');
    });

    it('should sanitize campaign name for filename', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign!!! @#$%',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [],
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (fsSync.existsSync as any).mockReturnValue(true);

      const mockArchive = {
        file: vi.fn(),
        append: vi.fn(),
        finalize: vi.fn(),
      };
      (archiver as any).mockReturnValue(mockArchive);

      const result = await generateCampaignZip('campaign-1');

      expect(result.filename).toBe('test-campaign.zip');
    });

    it('should throw error when campaign not found', async () => {
      (prisma.campaigns.findUnique as any).mockResolvedValue(null);

      await expect(generateCampaignZip('non-existent')).rejects.toThrow(
        'Campaign not found'
      );
    });
  });
});

describe('UserCampaignsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAvailableCampaigns', () => {
    it('should return campaigns with asset counts', async () => {
      const mockCampaigns = [
        {
          id: 'campaign-1',
          name: 'Campaign 1',
          price: 49.99,
          product_url: 'https://example.com/1',
          main_video_url: '/uploads/campaigns/1.mp4',
          created_at: new Date('2024-01-02'),
          updated_at: new Date('2024-01-02'),
          campaign_assets: [
            {
              id: 'asset-1',
              campaign_id: 'campaign-1',
              asset_url: '/uploads/campaigns/image1.jpg',
              asset_type: 'image',
              created_at: new Date(),
            },
            {
              id: 'asset-2',
              campaign_id: 'campaign-1',
              asset_url: '/uploads/campaigns/image2.jpg',
              asset_type: 'image',
              created_at: new Date(),
            },
          ],
        },
        {
          id: 'campaign-2',
          name: 'Campaign 2',
          price: 79.99,
          product_url: 'https://example.com/2',
          main_video_url: '/uploads/campaigns/2.mp4',
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
          campaign_assets: [],
        },
      ];

      (prisma.campaigns.findMany as any).mockResolvedValue(mockCampaigns);

      const result = await UserCampaignsService.listAvailableCampaigns();

      expect(result).toHaveLength(2);
      expect(result[0].asset_count).toBe(2);
      expect(result[1].asset_count).toBe(0);
      expect(result[0].id).toBe('campaign-1');
      expect(prisma.campaigns.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' },
        include: { campaign_assets: true },
      });
    });

    it('should return empty array when no campaigns exist', async () => {
      (prisma.campaigns.findMany as any).mockResolvedValue([]);

      const result = await UserCampaignsService.listAvailableCampaigns();

      expect(result).toEqual([]);
    });
  });

  describe('getCampaignForDownload', () => {
    it('should return campaign and track download', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [
          {
            id: 'asset-1',
            campaign_id: 'campaign-1',
            asset_url: '/uploads/campaigns/image1.jpg',
            asset_type: 'image',
            created_at: new Date(),
          },
        ],
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (prisma.campaign_downloads.findFirst as any).mockResolvedValue(null);
      (prisma.campaign_downloads.create as any).mockResolvedValue({
        id: 'download-1',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        downloaded_at: new Date(),
      });

      const result = await UserCampaignsService.getCampaignForDownload(
        'campaign-1',
        'user-1'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('campaign-1');
      expect(result.assets).toHaveLength(1);
      expect(prisma.campaign_downloads.create).toHaveBeenCalled();
    });

    it('should throw error when campaign not found', async () => {
      (prisma.campaigns.findUnique as any).mockResolvedValue(null);

      await expect(
        UserCampaignsService.getCampaignForDownload('non-existent', 'user-1')
      ).rejects.toThrow('Campaign not found');
    });

    it('should be idempotent for same user', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        price: 99.99,
        product_url: 'https://example.com/product',
        main_video_url: '/uploads/campaigns/video.mp4',
        created_at: new Date(),
        updated_at: new Date(),
        campaign_assets: [],
      };

      const mockExistingDownload = {
        id: 'download-1',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        downloaded_at: new Date('2024-01-01'),
      };

      (prisma.campaigns.findUnique as any).mockResolvedValue(mockCampaign);
      (prisma.campaign_downloads.findFirst as any).mockResolvedValue(mockExistingDownload);
      (prisma.campaign_downloads.update as any).mockResolvedValue({
        ...mockExistingDownload,
        downloaded_at: new Date(),
      });

      await UserCampaignsService.getCampaignForDownload('campaign-1', 'user-1');

      expect(prisma.campaign_downloads.update).toHaveBeenCalledWith({
        where: { id: 'download-1' },
        data: { downloaded_at: expect.any(Date) },
      });
      expect(prisma.campaign_downloads.create).not.toHaveBeenCalled();
    });
  });

  describe('trackDownload', () => {
    it('should create new download record', async () => {
      const mockDownload = {
        id: 'download-1',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        downloaded_at: new Date(),
      };

      (prisma.campaign_downloads.findFirst as any).mockResolvedValue(null);
      (prisma.campaign_downloads.create as any).mockResolvedValue(mockDownload);

      await UserCampaignsService.trackDownload('campaign-1', 'user-1');

      expect(prisma.campaign_downloads.findFirst).toHaveBeenCalledWith({
        where: {
          campaign_id: 'campaign-1',
          user_id: 'user-1',
        },
      });
      expect(prisma.campaign_downloads.create).toHaveBeenCalledWith({
        data: {
          campaign_id: 'campaign-1',
          user_id: 'user-1',
          downloaded_at: expect.any(Date),
        },
      });
    });

    it('should update existing download record', async () => {
      const mockExistingDownload = {
        id: 'download-1',
        campaign_id: 'campaign-1',
        user_id: 'user-1',
        downloaded_at: new Date('2024-01-01'),
      };

      (prisma.campaign_downloads.findFirst as any).mockResolvedValue(mockExistingDownload);
      (prisma.campaign_downloads.update as any).mockResolvedValue({
        ...mockExistingDownload,
        downloaded_at: new Date(),
      });

      await UserCampaignsService.trackDownload('campaign-1', 'user-1');

      expect(prisma.campaign_downloads.update).toHaveBeenCalledWith({
        where: { id: 'download-1' },
        data: {
          downloaded_at: expect.any(Date),
        },
      });
      expect(prisma.campaign_downloads.create).not.toHaveBeenCalled();
    });
  });
});
