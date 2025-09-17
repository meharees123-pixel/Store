import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateCartDto,
  UpdateCartDto,
} from '../dto/cart.dto';
import { Cart } from '../models/cart.model';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart & Document>,
  ) {}

  async create(dto: CreateCartDto): Promise<Cart & Document> {
    return this.cartModel.create(dto);
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
    return this.cartModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.cartModel.findByIdAndDelete(id).exec();
    return { deleted: !!deleted };
  }
}