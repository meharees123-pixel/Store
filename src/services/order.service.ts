import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOrderDto, UpdateOrderDto } from '../dto/order.dto';
import { Order } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order & Document>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart & Document>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product & Document>,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order & Document> {
    const cartItems = await this.cartModel.find({
      userId: dto.userId,
      storeId: dto.storeId,
      userAddressId: dto.userAddressId,
    }).exec();

    if (!cartItems.length) {
      throw new NotFoundException('No cart items found for this user and store');
    }

    // Validate and update product quantities
    for (const item of cartItems) {
      const product = await this.productModel.findById(item.productId).exec();

      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        );
      }

      product.quantity -= item.quantity;
      await product.save();
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const order = await this.orderModel.create({
      userId: dto.userId,
      userAddressId: dto.userAddressId,
      storeId: dto.storeId,
      totalAmount,
      items: cartItems,
      status: 'Pending',
    });

    await this.cartModel.deleteMany({
      userId: dto.userId,
      storeId: dto.storeId,
      userAddressId: dto.userAddressId,
    });

    return order;
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).exec();
  }

  async findOne(id: string): Promise<Order & Document> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

async update(id: string, dto: UpdateOrderDto): Promise<Order & Document> {
  const order = await this.orderModel.findById(id).exec();
  if (!order) throw new NotFoundException('Order not found');

  // Handle item updates
  if (dto.items && dto.items.length > 0) {
    const updatedItems = [];

    for (const update of dto.items) {
      const existing = order.items.find(i => i.productId.toString() === update.productId);
      if (!existing) continue;

      const product = await this.productModel.findById(update.productId).exec();
      if (!product) throw new NotFoundException(`Product not found: ${update.productId}`);

      // Handle deletion
      if (update.remove) {
        product.quantity += existing.quantity;
        await product.save();
        continue; // skip adding to updatedItems
      }

      // Handle quantity update
      if (typeof update.quantity === 'number') {
        const diff = update.quantity - existing.quantity;

        if (diff > 0 && product.quantity < diff) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }

        product.quantity -= diff;
        await product.save();

        existing.quantity = update.quantity;
        existing.totalPrice = update.quantity * existing.unitPrice;
      }

      updatedItems.push(existing);
    }

    order.items = updatedItems;
    order.totalAmount = updatedItems.reduce((sum, i) => sum + i.totalPrice, 0);
  }

  // Update status or address
  if (dto.status) order.status = dto.status;
  if (dto.userAddressId) order.userAddressId = dto.userAddressId;

  await order.save();
  return order;
}

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.orderModel.findByIdAndDelete(id).exec();
    return { deleted: !!deleted };
  }
}