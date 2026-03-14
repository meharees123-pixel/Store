import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCartDto, UpdateCartDto } from '../dto/cart.dto';
import { Cart } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable()
export class CartService {
    constructor(
        @InjectModel(Cart.name)
        private readonly cartModel: Model<Cart & Document>,

        @InjectModel(Product.name)
        private readonly productModel: Model<Product & Document>,
    ) { }

    async create(dto: CreateCartDto): Promise<Cart & Document> {
        const product = await this.productModel.findById(dto.productId).exec();

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.quantity <= 0) {
            throw new BadRequestException('Product is out of stock');
        }

        if (dto.quantity > product.quantity) {
            throw new BadRequestException(`Only ${product.quantity} units available`);
        }

        const storeId = (product as any).storeId || dto.storeId;
        if (!storeId) {
            throw new BadRequestException('storeId is required');
        }

        const cartItem = new this.cartModel({
            userId: dto.userId,
            storeId,
            userAddressId: dto.userAddressId ?? dto.addressId,
            deliveryLocationId: dto.deliveryLocationId,
            addressId: dto.addressId, // legacy
            productId: dto.productId,
            quantity: dto.quantity,
            unitPrice: product.price,
            totalPrice: product.price * dto.quantity,
            categoryId: product.categoryId,
            subcategoryId: product.subcategoryId,
        });

        return cartItem.save();
    }

    async findAll(): Promise<Cart[]> {
        return this.cartModel.find().exec();
    }

    async findByUser(userId: string): Promise<Cart[]> {
        return this.cartModel.find({ userId }).exec();
    }

    async findOne(id: string): Promise<Cart & Document> {
        return this.cartModel.findById(id).exec();
    }

    async update(id: string, dto: UpdateCartDto): Promise<Cart & Document> {
        const product = await this.productModel.findById(dto.productId).exec();

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (product.quantity <= 0) {
            throw new BadRequestException('Product is out of stock');
        }

        if (dto.quantity > product.quantity) {
            throw new BadRequestException(`Only ${product.quantity} units available`);
        }

        const storeId = (product as any).storeId || dto.storeId;
        if (!storeId) {
            throw new BadRequestException('storeId is required');
        }

        const updatedCart = await this.cartModel.findByIdAndUpdate(
            id,
            {
                userId: dto.userId,
                storeId,
                userAddressId: dto.userAddressId ?? dto.addressId,
                deliveryLocationId: dto.deliveryLocationId,
                addressId: dto.addressId, // legacy
                productId: dto.productId,
                quantity: dto.quantity,
                unitPrice: product.price,
                totalPrice: product.price * dto.quantity,
                categoryId: product.categoryId,
                subcategoryId: product.subcategoryId,
            },
            { new: true, runValidators: true },
        ).exec();

        if (!updatedCart) {
            throw new NotFoundException(`Cart item with ID ${id} not found`);
        }

        return updatedCart;
    }

    async findByStore(storeId: string): Promise<Cart[]> {
        return this.cartModel.find({ storeId }).exec();
    }

    async delete(id: string): Promise<{ deleted: boolean }> {
        const deleted = await this.cartModel.findByIdAndDelete(id).exec();
        return { deleted: !!deleted };
    }

    async updateAddressForUserStore(params: {
        userId: string;
        storeId: string;
        userAddressId?: string;
        deliveryLocationId?: string;
        addressId?: string;
    }): Promise<{ matched: number; modified: number }> {
        const userAddressId = params.userAddressId ?? params.addressId;
        const update: any = {};
        if (userAddressId) update.userAddressId = userAddressId;
        if (params.deliveryLocationId) update.deliveryLocationId = params.deliveryLocationId;
        if (params.addressId) update.addressId = params.addressId; // legacy, keep if client still sends it

        if (!Object.keys(update).length) {
            throw new BadRequestException('userAddressId or deliveryLocationId is required');
        }

        const result: any = await this.cartModel
            .updateMany(
                { userId: params.userId, storeId: params.storeId },
                { $set: update },
            )
            .exec();

        const matched = Number(result?.matchedCount ?? result?.n ?? 0);
        const modified = Number(result?.modifiedCount ?? result?.nModified ?? 0);
        return { matched, modified };
    }

    async countByUserStore(params: { userId: string; storeId: string }): Promise<{ count: number }> {
        const count = await this.cartModel.countDocuments({
            userId: params.userId,
            storeId: params.storeId,
        });
        return { count };
    }
}
