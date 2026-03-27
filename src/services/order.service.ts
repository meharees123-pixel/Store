import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOrderDto, UpdateOrderDto, OrderSummaryDto } from '../dto/order.dto';
import { CartProductSummaryDto } from '../dto/cart.dto';
import { Order } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { Product } from '../models/product.model';
import { OrderStatus } from '../constants/order-status';
import { AppSettingsService } from './app-settings.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order & Document>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart & Document>,
    @InjectModel(Product.name)
    private readonly productModel: Model<Product & Document>,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order & Document> {
    const cartQuery: any = { userId: dto.userId, storeId: dto.storeId };

    // Prefer the new fields; fall back to legacy `addressId` behavior.
    cartQuery.$or = [{ userAddressId: dto.userAddressId }, { addressId: dto.userAddressId }];
    if (dto.deliveryLocationId) cartQuery.deliveryLocationId = dto.deliveryLocationId;

    const cartItems = await this.cartModel.find(cartQuery).exec();

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
      deliveryLocationId: dto.deliveryLocationId,
      storeId: dto.storeId,
      totalAmount,
      items: cartItems,
      status: OrderStatus.PENDING,
    });

    const deleteQuery: any = { userId: dto.userId, storeId: dto.storeId, $or: cartQuery.$or };
    if (dto.deliveryLocationId) deleteQuery.deliveryLocationId = dto.deliveryLocationId;
    await this.cartModel.deleteMany(deleteQuery);

    return order;
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findByUser(userId: string): Promise<OrderSummaryDto[]> {
    const orders = await this.orderModel.find({ userId }).lean().exec();
    if (!orders.length) return [];
    return Promise.all(orders.map((order) => this.buildOrderSummary(order)));
  }

  async findByStore(storeId: string): Promise<Order[]> {
    return this.orderModel.find({ storeId }).exec();
  }

  async findOne(id: string): Promise<Order & Document> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async update(id: string, dto: UpdateOrderDto): Promise<Order & Document> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');

    // Handle item updates (add/remove/change quantity)
    if (dto.items && dto.items.length > 0) {
      const items = Array.isArray(order.items) ? [...order.items] : [];
      const indexByProductId = new Map<string, number>();
      for (let i = 0; i < items.length; i++) {
        const pid = items[i]?.productId;
        if (pid !== undefined && pid !== null) {
          indexByProductId.set(String(pid), i);
        }
      }

      for (const change of dto.items) {
        const productId = String(change.productId || '').trim();
        if (!productId) continue;

        const itemIndex = indexByProductId.get(productId);

        const product = await this.productModel.findById(productId).exec();
        if (!product) throw new NotFoundException(`Product not found: ${productId}`);

        if (change.remove) {
          if (itemIndex === undefined) continue;
          const existing = items[itemIndex];
          product.quantity += Number(existing.quantity || 0);
          await product.save();
          items.splice(itemIndex, 1);
          indexByProductId.delete(productId);
          // Rebuild indices after splice (small arrays expected)
          indexByProductId.clear();
          for (let i = 0; i < items.length; i++) {
            const pid = items[i]?.productId;
            if (pid !== undefined && pid !== null) indexByProductId.set(String(pid), i);
          }
          continue;
        }

        if (typeof change.quantity === 'number') {
          const nextQty = change.quantity;
          if (!Number.isFinite(nextQty) || nextQty < 1) {
            throw new BadRequestException('Invalid quantity');
          }

          if (itemIndex === undefined) {
            // Add new item
            if (product.quantity < nextQty) {
              throw new BadRequestException(`Insufficient stock for ${product.name}`);
            }

            product.quantity -= nextQty;
            await product.save();

            items.push({
              userId: (order as any).userId,
              storeId: (order as any).storeId,
              userAddressId: (order as any).userAddressId,
              deliveryLocationId: (order as any).deliveryLocationId,
              productId,
              quantity: nextQty,
              unitPrice: Number((product as any).price || 0),
              totalPrice: nextQty * Number((product as any).price || 0),
              categoryId: (product as any).categoryId,
              subcategoryId: (product as any).subcategoryId,
            });
            indexByProductId.set(productId, items.length - 1);
            continue;
          }

          const existing = items[itemIndex];
          const currentQty = Number(existing.quantity || 0);
          const diff = nextQty - currentQty;

          if (diff > 0 && product.quantity < diff) {
            throw new BadRequestException(`Insufficient stock for ${product.name}`);
          }

          // diff > 0 reduces stock; diff < 0 restores stock (since subtracting negative adds)
          product.quantity -= diff;
          await product.save();

          existing.quantity = nextQty;
          existing.totalPrice = nextQty * Number(existing.unitPrice || 0);
        }
      }

      order.items = items;
      order.totalAmount = items.reduce((sum, i) => sum + Number(i?.totalPrice || 0), 0);
    }

    if (dto.status) order.status = dto.status;
    if (dto.userAddressId) order.userAddressId = dto.userAddressId;
    if (dto.deliveryLocationId !== undefined) order.deliveryLocationId = dto.deliveryLocationId || undefined;

    await order.save();
    return order;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.orderModel.findByIdAndDelete(id).exec();
    return { deleted: !!deleted };
  }

  private async buildOrderSummary(order: Order & { _id: any; items: any[] }): Promise<OrderSummaryDto> {
    const items = Array.isArray(order.items) ? order.items : [];
    const productIds = Array.from(
      new Set(
        items
          .map((item) => this.normalizeId((item as any).productId))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const products = productIds.length
      ? await this.productModel.find({ _id: { $in: productIds } }).lean().exec()
      : [];
    const productMap = new Map(products.map((product) => [product._id?.toString() ?? '', product]));

    const summaryProducts = items.map((item) => this.mapOrderItemToProduct(item, productMap));

    const totalPrice = summaryProducts.reduce((sum, item) => sum + this.toNumber(item.totalPrice), 0);
    const totalMrp = summaryProducts.reduce(
      (sum, item) => sum + this.toNumber(item.mrp ?? item.price) * this.toNumber(item.selectedQuantity),
      0,
    );

    const { deliveryCharge, handlingCharge, deliveryTime } = await this.loadCharges(String(order.storeId));
    const deliveryChargeNum = this.parseNumber(deliveryCharge);
    const handlingChargeNum = this.parseNumber(handlingCharge);
    const totalBill = totalPrice + deliveryChargeNum + handlingChargeNum;

    return {
      orderId: String(order._id),
      userId: String(order.userId),
      storeId: String(order.storeId),
      userAddressId: order.userAddressId ? String(order.userAddressId) : undefined,
      deliveryLocationId: order.deliveryLocationId ? String(order.deliveryLocationId) : undefined,
      deliveryTime,
      deliveryCharge,
      handlingCharge,
      TotalSaving: this.formatAmount(totalMrp - totalPrice),
      TatalBill: this.formatAmount(totalBill),
      products: summaryProducts,
    };
  }

  private mapOrderItemToProduct(item: any, productMap: Map<string, Product>): CartProductSummaryDto {
    const productId = this.normalizeId(item.productId) ?? '';
    const productDetail = productMap.get(productId);
    const quantity = this.toNumber(item.quantity);
    const price = this.toNumber(item.unitPrice ?? productDetail?.price);
    const mrp = this.toNumber(productDetail?.mrp ?? item.mrp ?? price);
    const availableQty = this.toNumber(productDetail?.quantity);

    const itemId =
      this.normalizeId((item as any)._id) ??
      productId ??
      this.normalizeId((item as any).id) ??
      '';

    return {
      _id: itemId || '',
      isActive: true,
      subcategoryId: item.subcategoryId,
      productId,
      name: productDetail?.name ?? item.name,
      description: productDetail?.description ?? item.description,
      price,
      productImage: productDetail?.productImage,
      selectedQuantity: quantity,
      availableQuantity: availableQty,
      mrp,
      totalPrice: this.toNumber(item.totalPrice ?? price * quantity),
    };
  }

  private async loadCharges(storeId: string): Promise<{
    deliveryCharge: string;
    handlingCharge: string;
    deliveryTime: string;
  }> {
    const [deliveryCharge, handlingCharge, deliveryTime] = await Promise.all([
      this.fetchSettingValue(storeId, 'DLC'),
      this.fetchSettingValue(storeId, 'HDC'),
      this.fetchSettingValue(storeId, 'DTIME'),
    ]);
    return { deliveryCharge, handlingCharge, deliveryTime };
  }

  private async fetchSettingValue(storeId: string, key: string): Promise<string> {
    const setting = await this.appSettingsService.findByKeyWithFallback({ key, storeId });
    if (!setting || setting.value === undefined || setting.value === null) {
      return '0';
    }
    return String(setting.value);
  }

  private parseNumber(value: string): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatAmount(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const formatted = value.toFixed(2);
    if (formatted.endsWith('.00')) {
      return formatted.slice(0, -3);
    }
    return formatted;
  }

  private normalizeId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'toString' in value) {
      return (value as { toString(): string }).toString();
    }
    return String(value);
  }
}
