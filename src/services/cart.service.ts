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

  const cartItem = new this.cartModel({
    userId: dto.userId,
    userAddressId: dto.userAddressId,
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

        return this.cartModel
            .findByIdAndUpdate(id, dto, {
                new: true,
                runValidators: true,
            })
            .exec();
    }

    async delete(id: string): Promise<{ deleted: boolean }> {
        const deleted = await this.cartModel.findByIdAndDelete(id).exec();
        return { deleted: !!deleted };
    }
}