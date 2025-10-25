import {
    Injectable,
    InternalServerErrorException,
    NotFoundException,
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
import { AppSettings } from '../models/app-settings.model';
import { Category } from '../models/category.model';
import { Subcategory } from '../models/subcategory.model';

@Injectable()
export class ProductService {
    constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(AppSettings.name)
    private readonly appSettingsModel: Model<AppSettings & Document>,

    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category & Document>,

    @InjectModel(Subcategory.name)
    private readonly subcategoryModel: Model<Subcategory & Document>,
    ) { }

    async create(
        createProductDto: CreateProductDto,
        userId: string,
    ): Promise<ProductDocument> {
        try {
            const product = new this.productModel({
                ...createProductDto,
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

    async findByCategoryId(
        categoryId: string,
    ): Promise<ProductDocument[]> {
        return this.productModel
            .find({ categoryId })
            .exec();
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
        return this.productModel
            .findByIdAndUpdate(
                id,
                {
                    ...updateProductDto,
                    updatedBy: userId,
                },
                { new: true },
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

    async getDashboardProducts(storeId: string): Promise<any[]> {
        const setting = await this.appSettingsModel.findOne({ key: 'dashboardProductCategories' }).exec();
        if (!setting || !Array.isArray(setting.value)) return [];

        // Step 1: Get categories by code
        const categories = await this.categoryModel.find({ code: { $in: setting.value } }).exec();
        const categoryIds = categories.map(c => c._id);

        // Step 2: Get subcategories under those categories
        const subcategories = await this.subcategoryModel.find({ categoryId: { $in: categoryIds } }).exec();
        const subcategoryMap = new Map<string, string>(); // subcategoryId → categoryId
        subcategories.forEach(sub => subcategoryMap.set(sub._id.toString(), sub.categoryId.toString()));

        // Step 3: Get products under those subcategories and store
        const products = await this.productModel.find({
            storeId,
            subcategoryId: { $in: Array.from(subcategoryMap.keys()) },
        }).exec();

        // Step 4: Group products under their parent category
        const grouped: Record<string, any[]> = {};
        for (const product of products) {
            const subId = product.subcategoryId.toString();
            const catId = subcategoryMap.get(subId);
            if (!catId) continue;

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

}
