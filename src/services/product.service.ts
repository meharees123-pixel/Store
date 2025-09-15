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

@Injectable()
export class ProductService {
    constructor(
        @InjectModel(Product.name)
        private readonly productModel: Model<ProductDocument>,
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
}
