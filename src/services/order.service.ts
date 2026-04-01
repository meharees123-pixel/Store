import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Document, Model } from 'mongoose';
import { CreateOrderDto, UpdateOrderDto, OrderSummaryDto } from '../dto/order.dto';
import { CartProductSummaryDto } from '../dto/cart.dto';
import { Order } from '../models/order.model';
import { Cart } from '../models/cart.model';
import { Product } from '../models/product.model';
import { OrderStatus } from '../constants/order-status';
import { AppSettingsService } from './app-settings.service';
import { UserAddressService } from './user-address.service';
import { UserAddress } from '../models/user-address.model';

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
    private readonly userAddressService: UserAddressService,
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

    const productCache = new Map<string, Product & Document>();
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

      const normalizedId = this.normalizeId(product._id) ?? '';
      if (normalizedId) productCache.set(normalizedId, product);
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const enrichedItems = cartItems.map((item) => {
      const plain: any = item.toObject ? item.toObject() : { ...item };
      const productDetail = productCache.get(this.normalizeId(item.productId) ?? '');
      const computedPrice = this.toNumber(productDetail?.price ?? plain.unitPrice);
      const computedMrp = this.toNumber(productDetail?.mrp ?? productDetail?.price ?? computedPrice);
      plain.productName = productDetail?.name;
      plain.productDescription = productDetail?.description;
      plain.productImage = productDetail?.productImage;
      plain.price = computedPrice;
      plain.mrp = computedMrp;
      plain.availableQuantity = this.toNumber(productDetail?.quantity);
      return plain;
    });

    const totalMrp = enrichedItems.reduce(
      (sum, item) => sum + this.toNumber(item.mrp ?? item.price) * this.toNumber(item.quantity),
      0,
    );

    const charges = await this.loadCharges(dto.storeId);
    const totalSaving = this.formatAmount(totalMrp - totalAmount);
    const totalBill = this.formatAmount(
      totalAmount + this.parseNumber(charges.deliveryCharge) + this.parseNumber(charges.handlingCharge),
    );

    const order = await this.orderModel.create({
      userId: dto.userId,
      userAddressId: dto.userAddressId,
      deliveryLocationId: dto.deliveryLocationId,
      storeId: dto.storeId,
      totalAmount,
      deliveryTime: charges.deliveryTime,
      deliveryCharge: charges.deliveryCharge,
      handlingCharge: charges.handlingCharge,
      TotalSaving: totalSaving,
      TatalBill: totalBill,
      items: enrichedItems,
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
          .map((item) => this.normalizeId(item.productId))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const products = productIds.length
      ? await this.productModel.find({ _id: { $in: productIds } }).lean().exec()
      : [];
    const productMap = new Map(products.map((product) => [product._id?.toString() ?? '', product]));
    const summaryProducts: CartProductSummaryDto[] = items.map((item) =>
      this.mapOrderItemToProduct(item, productMap),
    );

    const totalPrice = this.toNumber(order.totalAmount);
    const totalMrp = summaryProducts.reduce(
      (sum, item) => sum + this.toNumber(item.mrp ?? item.price) * this.toNumber(item.selectedQuantity),
      0,
    );

    const fallbackCharges = await this.loadCharges(String(order.storeId));
    const deliveryCharge = order.deliveryCharge ?? fallbackCharges.deliveryCharge;
    const handlingCharge = order.handlingCharge ?? fallbackCharges.handlingCharge;
    const deliveryTime = order.deliveryTime ?? fallbackCharges.deliveryTime;
    const totalSaving = order.TotalSaving ?? this.formatAmount(totalMrp - totalPrice);
    const totalBill = order.TatalBill
      ? order.TatalBill
      : this.formatAmount(totalPrice + this.parseNumber(deliveryCharge) + this.parseNumber(handlingCharge));

    const userAddressFull = await this.resolveAddressFull(order.userAddressId);

    const orderDate = this.formatOrderDate(order.createdAt ?? new Date());

    return {
      orderId: String(order._id),
      userId: String(order.userId),
      storeId: String(order.storeId),
      userAddressId: order.userAddressId ? String(order.userAddressId) : undefined,
      deliveryLocationId: order.deliveryLocationId ? String(order.deliveryLocationId) : undefined,
      userAddressFull,
      deliveryTime,
      deliveryCharge,
      handlingCharge,
      TotalSaving: totalSaving,
      TatalBill: totalBill,
      orderDate,
      products: summaryProducts,
    };
  }

  private mapOrderItemToProduct(item: any, productMap: Map<string, Product & Document>): CartProductSummaryDto {
    const productId = this.normalizeId(item.productId) ?? '';
    const quantity = this.toNumber(item.selectedQuantity ?? item.quantity);
    const productDetail = productMap.get(productId);
    const price = this.toNumber(item.price ?? item.unitPrice ?? productDetail?.price);
    const mrp = this.toNumber(item.mrp ?? productDetail?.mrp ?? price);
    const availableQty = this.toNumber(item.availableQuantity ?? productDetail?.quantity);
    const itemId =
      this.normalizeId((item as any)._id) ??
      this.normalizeId((item as any).id) ??
      productId ??
      '';

    return {
      _id: itemId || '',
      isActive: Boolean(item.isActive ?? true),
      subcategoryId: item.subcategoryId,
      productId,
      name: item.productName ?? item.name ?? productDetail?.name,
      description: item.productDescription ?? item.description ?? productDetail?.description,
      price,
      productImage: item.productImage ?? productDetail?.productImage,
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

  private async resolveAddressFull(addressId?: string): Promise<string | undefined> {
    if (!addressId) return undefined;
    try {
      const address = await this.userAddressService.findOne(addressId);
      return this.buildFullAddress(address);
    } catch {
      return undefined;
    }
  }

  private buildFullAddress(address?: UserAddress | null): string | undefined {
    if (!address) return undefined;
    const parts = [address.street, address.city, address.state, address.country]
      .map((value) => String(value || '').trim())
      .filter((value) => value.length > 0);
    return parts.length ? parts.join(', ') : undefined;
  }

  private formatOrderDate(date: Date | string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = months[parsed.getMonth()] ?? 'JAN';
    const year = parsed.getFullYear();
    let hours = parsed.getHours();
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minute} ${period}`;
  }
}
