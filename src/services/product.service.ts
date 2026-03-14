import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import {
    InjectModel,
} from '@nestjs/mongoose';
import {
    Model as MongooseModel,
    Document as MongooseDocument,
} from 'mongoose';
import {
    Product,
    ProductDocument,
} from '../models/product.model';
import {
    CreateProductDto,
    UpdateProductDto,
    ProductResponseDto,
} from '../dto/product.dto';
import { Category } from '../models/category.model';
import { Subcategory } from '../models/subcategory.model';
import { GcsStorageService } from './gcs-storage.service';
import { AppSettingsService } from './app-settings.service';

@Injectable()
export class ProductService {
    constructor(
        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,

        @InjectModel(Category.name)
        private readonly categoryModel: Model<Category & Document>,

        @InjectModel(Subcategory.name)
        private readonly subcategoryModel: Model<Subcategory & Document>,

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

    private async findStoreCategoryIds(storeId: string): Promise<any[]> {
        const direct = await this.categoryModel.find({ storeId }).select('_id').lean().exec();
        if (direct.length) return direct.map((c: any) => c._id);

        // Legacy fallback if `storeId` was stored as a string in MongoDB.
        const legacy = await this.categoryModel
            .find({ $expr: { $eq: [{ $toString: '$storeId' }, storeId] } } as any)
            .select('_id')
            .lean()
            .exec();

        return legacy.map((c: any) => c._id);
    }

    private async findStoreCategoriesByCodes(storeId: string, codes: string[]) {
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

        const codeRegexes = codes
            .map((c) => String(c).trim())
            .filter(Boolean)
            .map((c) => new RegExp(`^${this.escapeRegex(c)}$`, 'i'));
        if (!codeRegexes.length) return [];

        return this.categoryModel
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
    }

    async create(
        createProductDto: CreateProductDto,
        userId: string,
    ): Promise<ProductDocument> {
        try {
            const category = await this.categoryModel.findById(createProductDto.categoryId).exec();
            if (!category) throw new NotFoundException('Category not found');

            const product = new this.productModel({
                ...createProductDto,
                storeId: String((category as any).storeId),
                createdBy: userId,
                updatedBy: userId,
            });
            return await product.save();
        } catch (error) {
            throw new InternalServerErrorException('Error creating product');
        }
    }

    async findAll(): Promise<ProductDocument[]> {
        return this.productModel.find().exec();
    }

    async findByStoreId(storeId: string): Promise<ProductDocument[]> {
        const direct = await this.productModel.find({ storeId }).exec();
        if (direct.length) return direct;

        // Legacy fallback if `storeId` was stored as a string in MongoDB.
        const legacy = await this.productModel
            .find({ $expr: { $eq: [{ $toString: '$storeId' }, storeId] } } as any)
            .exec();
        if (legacy.length) return legacy;

        // Older documents may not have `storeId` at all; fall back to store-scoped categoryIds.
        const categoryIds = await this.findStoreCategoryIds(String(storeId));
        if (!categoryIds.length) return [];

        const categoryIdStrings = categoryIds.map((id) => String(id));
        return this.productModel
            .find({
                $or: [
                    { categoryId: { $in: categoryIds as any } },
                    { categoryId: { $in: categoryIdStrings as any } },
                ],
            } as any)
            .exec();
    }

    async search(params: { q: string; storeId?: string; limit?: number; skip?: number }): Promise<ProductDocument[]> {
        const q = params.q?.trim();
        if (!q) throw new BadRequestException('q is required');

        const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
        const skip = Math.max(params.skip ?? 0, 0);

        let storeFilter: Record<string, any> | null = null;
        if (params.storeId) {
            const categoryIds = await this.findStoreCategoryIds(String(params.storeId));
            if (!categoryIds.length) return [];

            // Handle legacy data where `categoryId` may have been stored as a string instead of ObjectId.
            const categoryIdStrings = categoryIds.map((x) => String(x));
            storeFilter = {
                $or: [
                    { categoryId: { $in: categoryIds } },
                    { $expr: { $in: [{ $toString: '$categoryId' }, categoryIdStrings] } } as any,
                ],
            };
        }

        // Prefer $text when available (requires MongoDB text index), but still support prefix/partial queries via regex.
        const shouldUseText = q.length >= 3;
        if (shouldUseText) {
            try {
                const textQuery: any = { $text: { $search: q } };
                if (storeFilter) Object.assign(textQuery, storeFilter);

                const textResults = await this.productModel
                    .find(textQuery, { score: { $meta: 'textScore' } } as any)
                    .sort({ score: { $meta: 'textScore' } } as any)
                    .skip(skip)
                    .limit(limit)
                    .exec();

                if (textResults.length) return textResults;
            } catch {
                // ignore and fall back to regex search
            }
        }

        // Fallback: regex search (works even without the index and supports partial queries like "gh").
        const re = new RegExp(this.escapeRegex(q), 'i');
        const regexOr = { $or: [{ name: re }, { description: re }] };
        const regexQuery: any = storeFilter ? { $and: [storeFilter, regexOr] } : regexOr;

        return this.productModel.find(regexQuery).skip(skip).limit(limit).exec();
    }

    async findByCategoryId(
        categoryId: string,
    ): Promise<ProductDocument[]> {
        return this.productModel
            .find({ categoryId })
            .exec();
    }

    async findBySubcategoryId(subcategoryId: string): Promise<ProductDocument[]> {
        return this.productModel.find({ subcategoryId }).exec();
    }

    async findByParentId(parentId: string): Promise<ProductDocument[]> {
        const [category, subcategory] = await Promise.all([
            this.categoryModel.findById(parentId).select('_id').lean().exec(),
            this.subcategoryModel.findById(parentId).select('_id').lean().exec(),
        ]);

        if (category) return this.findByCategoryId(parentId);
        if (subcategory) return this.findBySubcategoryId(parentId);

        return [];
    }

    async findOne(
        id: string,
    ): Promise<ProductDocument> {
        return this.productModel.findById(id).exec();
    }

    async update(
        id: string,
        updateProductDto: UpdateProductDto,
        userId: string,
    ): Promise<ProductDocument> {
        const existing = await this.productModel.findById(id).exec();
        if (!existing) throw new NotFoundException('Product not found');

        const nextCategoryId = updateProductDto.categoryId || (existing as any).categoryId;
        const category = await this.categoryModel.findById(nextCategoryId).exec();
        if (!category) throw new NotFoundException('Category not found');

        return this.productModel
            .findByIdAndUpdate(
                id,
                {
                    ...updateProductDto,
                    storeId: String((category as any).storeId),
                    updatedBy: userId,
                },
                { new: true, runValidators: true },
            )
            .exec();
    }

    async delete(
        id: string,
    ): Promise<{ deleted: boolean }> {
        const deletedDocument = await this.productModel
            .findByIdAndDelete(id)
            .exec();
        return { deleted: !!deletedDocument };
    }

    async uploadProductImage(params: {
        id: string;
        file: { buffer: Buffer; mimetype?: string; originalname?: string };
        userId?: string;
    }) {
        const { id, file, userId } = params;
        if (!file?.buffer) throw new BadRequestException('Missing image file');

        const product = await this.productModel.findById(id).exec();
        if (!product) throw new NotFoundException('Product not found');

        await this.gcsStorage.deleteByPublicUrl(product.productImage);

        const uploaded = await this.gcsStorage.uploadImage({
            folder: 'products',
            entityId: id,
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName: file.originalname,
        });

        product.productImage = uploaded.publicUrl;
        if (userId) product.updatedBy = userId;
        await product.save();

        return product;
    }

    async deleteProductImage(params: { id: string; userId?: string }) {
        const { id, userId } = params;
        const product = await this.productModel.findById(id).exec();
        if (!product) throw new NotFoundException('Product not found');

        await this.gcsStorage.deleteByPublicUrl(product.productImage);
        product.productImage = undefined;
        if (userId) product.updatedBy = userId;
        await product.save();

        return product;
    }

    async getDashboardProducts(storeId: string): Promise<any[]> {
        const [scoped, global] = await Promise.all([
            this.appSettingsService.findScopedByKey({ key: 'dashboardProductCategories', storeId }),
            this.appSettingsService.findGlobalByKey('dashboardProductCategories'),
        ]);

        const scopedCodes = this.parseCodes(scoped?.value);
        const globalCodes = this.parseCodes(global?.value);
        const categoryCodes = scopedCodes ?? globalCodes;
        if (!categoryCodes) return [];

        // Step 1: Get categories for this store by code
        let categories = await this.findStoreCategoriesByCodes(storeId, categoryCodes);

        // If store-scoped setting exists but yields no results, fall back to global setting.
        if (categories.length === 0 && scopedCodes && globalCodes) {
            categories = await this.findStoreCategoriesByCodes(storeId, globalCodes);
        }

        const categoryIds = categories.map(c => c._id);
        if (!categoryIds.length) return [];

        // Step 2: Get subcategories under those categories
        const subcategories = await this.subcategoryModel.find({ categoryId: { $in: categoryIds } }).exec();
        const subcategoryMap = new Map<string, string>(); // subcategoryId → categoryId
        subcategories.forEach(sub => subcategoryMap.set(sub._id.toString(), sub.categoryId.toString()));

        // Step 3: Get products under those categories.
        // NOTE: Product schema doesn't have required `storeId`, so filter by categoryIds (which are store-scoped).
        const categoryIdStrings = categoryIds.map((id) => String(id));
        const products = await this.productModel
            .find({
                $or: [
                    { categoryId: { $in: categoryIds as any } },
                    { categoryId: { $in: categoryIdStrings as any } },
                ],
            } as any)
            .exec();

        // Step 4: Group products under their parent category
        const grouped: Record<string, any[]> = {};
        for (const product of products) {
            const fallbackCatId = product.categoryId?.toString?.() ?? String((product as any).categoryId);
            let catId = fallbackCatId;

            const subId = product.subcategoryId ? String(product.subcategoryId) : '';
            const mapped = subId ? subcategoryMap.get(subId) : undefined;
            if (mapped) catId = mapped;

            if (!grouped[catId]) grouped[catId] = [];
            grouped[catId].push(product);
        }

        // Step 5: Build final response
        const result = categories.map(category => ({
            _id: category._id,
            name: category.name,
            code: category.categoryCode,
            image: category.categoryImage,
            description: category.description,
            products: grouped[category._id.toString()] || [],
        }));

        return result;
    }

    async getDashboardProductsDebug(storeId: string): Promise<{
        storeId: string;
        settingUsed: 'store' | 'global' | 'none';
        scopedSettingId?: string;
        globalSettingId?: string;
        codesUsed: string[];
        categoriesCount: number;
        result: any[];
    }> {
        const [scoped, global] = await Promise.all([
            this.appSettingsService.findScopedByKey({ key: 'dashboardProductCategories', storeId }),
            this.appSettingsService.findGlobalByKey('dashboardProductCategories'),
        ]);

        const scopedCodes = this.parseCodes(scoped?.value);
        const globalCodes = this.parseCodes(global?.value);

        const settingUsed: 'store' | 'global' | 'none' = scopedCodes
            ? 'store'
            : globalCodes
                ? 'global'
                : 'none';

        const codesUsed = scopedCodes ?? globalCodes ?? [];
        const result = codesUsed.length ? await this.getDashboardProducts(storeId) : [];

        return {
            storeId,
            settingUsed,
            scopedSettingId: (scoped as any)?._id?.toString?.(),
            globalSettingId: (global as any)?._id?.toString?.(),
            codesUsed,
            categoriesCount: result.length,
            result,
        };
    }

}
