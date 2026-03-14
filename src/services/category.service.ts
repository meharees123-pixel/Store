import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto
} from '../dto/category.dto';
import { Category } from '../models/category.model';
import { GcsStorageService } from './gcs-storage.service';
import { AppSettingsService } from './app-settings.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category & Document>,

    private readonly gcsStorage: GcsStorageService,
    private readonly appSettingsService: AppSettingsService,

  ) { }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private parseCodes(value?: string): string[] | null {
    if (!value || typeof value !== 'string') return null;
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return null;
      const codes = parsed.map((x) => String(x).trim()).filter(Boolean);
      return codes.length ? codes : null;
    } catch {
      return null;
    }
  }

  private async findStoreCategoriesByCodes(storeId: string, codes: string[]): Promise<Category[]> {
    const direct = await this.categoryModel.find({ storeId, categoryCode: { $in: codes } }).exec();
    if (direct.length) return direct;

    // Legacy fallback if `storeId` was stored as a string in MongoDB.
    const legacyStoreMatch = await this.categoryModel
      .find({
        categoryCode: { $in: codes },
        $expr: { $eq: [{ $toString: '$storeId' }, storeId] },
      } as any)
      .exec();
    if (legacyStoreMatch.length) return legacyStoreMatch;

    // Last-resort fallback: case-insensitive categoryCode matching (handles DB values like "Fruits" vs "FRUITS").
    const codeRegexes = codes
      .map((c) => String(c).trim())
      .filter(Boolean)
      .map((c) => new RegExp(`^${this.escapeRegex(c)}$`, 'i'));

    if (!codeRegexes.length) return [];

    const byRegex = await this.categoryModel
      .find({
        $and: [
          {
            $or: [
              { storeId },
              { $expr: { $eq: [{ $toString: '$storeId' }, storeId] } } as any,
            ],
          },
          { $or: codeRegexes.map((re) => ({ categoryCode: re })) },
        ],
      } as any)
      .exec();

    return byRegex;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category & Document> {
    return this.categoryModel.create(createCategoryDto);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  async findByStoreId(storeId: string): Promise<Category[]> {
    const direct = await this.categoryModel.find({ storeId }).exec();
    if (direct.length) return direct;

    // Legacy fallback if `storeId` was stored as a string in MongoDB.
    return this.categoryModel
      .find({ $expr: { $eq: [{ $toString: '$storeId' }, storeId] } } as any)
      .exec();
  }

  async findOne(id: string): Promise<Category & Document> {
    return this.categoryModel.findById(id).exec();
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category & Document> {
    return this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deletedDocument = await this.categoryModel.findByIdAndDelete(id).exec();
    return { deleted: !!deletedDocument };
  }

  async uploadCategoryImage(params: {
    id: string;
    file: { buffer: Buffer; mimetype?: string; originalname?: string };
    userId?: string;
  }) {
    const { id, file, userId } = params;
    if (!file?.buffer) throw new BadRequestException('Missing image file');

    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');

    await this.gcsStorage.deleteByPublicUrl(category.categoryImage);

    const uploaded = await this.gcsStorage.uploadImage({
      folder: 'categories',
      entityId: id,
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    category.categoryImage = uploaded.publicUrl;
    if (userId) category.updatedBy = userId;
    await category.save();

    return category;
  }

  async deleteCategoryImage(params: { id: string; userId?: string }) {
    const { id, userId } = params;
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');

    await this.gcsStorage.deleteByPublicUrl(category.categoryImage);
    category.categoryImage = undefined;
    if (userId) category.updatedBy = userId;
    await category.save();

    return category;
  }

  async getDashboardCategories(storeId: string): Promise<Category[]> {
    const [scoped, global] = await Promise.all([
      this.appSettingsService.findScopedByKey({ key: 'dashboardCategoryCodes', storeId }),
      this.appSettingsService.findGlobalByKey('dashboardCategoryCodes'),
    ]);

    const scopedCodes = this.parseCodes(scoped?.value);
    const globalCodes = this.parseCodes(global?.value);
    const codes = scopedCodes ?? globalCodes;
    if (!codes) return [];

    let categories = await this.findStoreCategoriesByCodes(storeId, codes);

    // If store-scoped setting exists but yields no results, fall back to global setting (helps avoid misconfiguration).
    if (categories.length === 0 && scopedCodes && globalCodes) {
      categories = await this.findStoreCategoriesByCodes(storeId, globalCodes);
    }

    return categories;
  }

  async getDashboardCategoriesDebug(storeId: string): Promise<{
    storeId: string;
    settingUsed: 'store' | 'global' | 'none';
    scopedSettingId?: string;
    globalSettingId?: string;
    codesUsed: string[];
    categoriesCount: number;
    categories: Category[];
    storeCategoryCodes: string[];
  }> {
    const [scoped, global, storeCatsDirect, storeCatsLegacy] = await Promise.all([
      this.appSettingsService.findScopedByKey({ key: 'dashboardCategoryCodes', storeId }),
      this.appSettingsService.findGlobalByKey('dashboardCategoryCodes'),
      this.categoryModel.find({ storeId }).select('categoryCode').lean().exec(),
      this.categoryModel
        .find({ $expr: { $eq: [{ $toString: '$storeId' }, storeId] } } as any)
        .select('categoryCode')
        .lean()
        .exec(),
    ]);

    const scopedCodes = this.parseCodes(scoped?.value);
    const globalCodes = this.parseCodes(global?.value);

    const settingUsed: 'store' | 'global' | 'none' = scopedCodes
      ? 'store'
      : globalCodes
        ? 'global'
        : 'none';

    const codesUsed = scopedCodes ?? globalCodes ?? [];
    const categories = codesUsed.length ? await this.getDashboardCategories(storeId) : [];

    return {
      storeId,
      settingUsed,
      scopedSettingId: (scoped as any)?._id?.toString?.(),
      globalSettingId: (global as any)?._id?.toString?.(),
      codesUsed,
      categoriesCount: categories.length,
      categories,
      storeCategoryCodes: [...(storeCatsDirect || []), ...(storeCatsLegacy || [])]
        .map((c: any) => String(c?.categoryCode || '').trim())
        .filter(Boolean),
    };
  }
}
