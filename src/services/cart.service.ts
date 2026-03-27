import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Document, Model } from 'mongoose';
import { CreateCartDto, UpdateCartDto, CartSummaryDto, CartProductSummaryDto } from '../dto/cart.dto';
import { Cart } from '../models/cart.model';
import { Product } from '../models/product.model';
import { UserAddress } from '../models/user-address.model';
import { AppSettingsService } from './app-settings.service';
import { UserAddressService } from './user-address.service';

@Injectable()
export class CartService {
    constructor(
        @InjectModel(Cart.name)
        private readonly cartModel: Model<Cart & Document>,

        @InjectModel(Product.name)
        private readonly productModel: Model<Product & Document>,

        private readonly appSettingsService: AppSettingsService,

        private readonly userAddressService: UserAddressService,
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
        const existingCart = await this.cartModel
            .findOne({ userId: dto.userId, storeId, productId: dto.productId })
            .exec();

        const desiredQuantity = (existingCart?.quantity ?? 0) + dto.quantity;
        if (desiredQuantity > product.quantity) {
            throw new BadRequestException(`Only ${product.quantity} units available`);
        }

        if (existingCart) {
            existingCart.quantity = desiredQuantity;
            existingCart.unitPrice = product.price;
            existingCart.totalPrice = product.price * desiredQuantity;
            existingCart.userAddressId = dto.userAddressId ?? dto.addressId ?? existingCart.userAddressId;
            existingCart.deliveryLocationId = dto.deliveryLocationId ?? existingCart.deliveryLocationId;
            existingCart.addressId = dto.addressId ?? existingCart.addressId;
            const updated = await existingCart.save();
            return updated;
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

    async findByUser(userId: string): Promise<(Cart & { product?: Product })[]> {
        return this.findWithProducts({ userId });
    }

    async findByUserStore(userId: string, storeId: string): Promise<(Cart & { product?: Product })[]> {
        return this.findWithProducts({ userId, storeId });
    }

    async getCartSummary(userId: string, storeId: string): Promise<CartSummaryDto> {
        const carts = await this.findWithProducts({ userId, storeId });
        const products = carts.map((cart) => this.mapToProductSummary(cart));

        const totalPrice = carts.reduce((sum, cart) => sum + this.toNumber(cart.totalPrice), 0);
        const totalMrp = carts.reduce((sum, cart) => {
            const mrpPerItem = this.determineMrpPerItem(cart);
            return sum + mrpPerItem * (cart.quantity ?? 0);
        }, 0);

        const { deliveryCharge, handlingCharge, deliveryTime } = await this.loadCharges(storeId);
        const deliveryChargeNum = this.parseNumber(deliveryCharge);
        const handlingChargeNum = this.parseNumber(handlingCharge);
        const totalBill = totalPrice + deliveryChargeNum + handlingChargeNum;

        const userAddressId = this.extractFirstValue(carts, (cart) => cart.userAddressId ?? cart.addressId);
        const deliveryLocationId = this.extractFirstValue(carts, (cart) => cart.deliveryLocationId);
        const legacyAddressId = this.extractFirstValue(carts, (cart) => cart.addressId);
        const userAddressFull = await this.resolveFullAddress(userAddressId);

        return {
            deliveryTime,
            deliveryCharge,
            handlingCharge,
            TotalSaving: this.formatAmount(totalMrp - totalPrice),
            TatalBill: this.formatAmount(totalBill),
            userId: String(userId),
            storeId: String(storeId),
            userAddressId,
            deliveryLocationId,
            userAddressFull,
            addressId: legacyAddressId,
            products,
        };
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

    private async findWithProducts(query: FilterQuery<Cart>): Promise<(Cart & { product?: Product })[]> {
        const carts = await this.cartModel.find(query).lean().exec();
        if (!carts.length) return carts as (Cart & { product?: Product })[];

        const productIds = Array.from(
            new Set(
                carts
                    .map((cart) => this.normalizeId(cart.productId))
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        const products = await this.productModel
            .find({ _id: { $in: productIds } })
            .lean()
            .exec();
        const productMap = new Map(products.map((product) => [product._id?.toString() ?? '', product]));

        return carts.map((cart) => ({
            ...cart,
            product: productMap.get(this.normalizeId(cart.productId) ?? ''),
        }));
    }

    private mapToProductSummary(cart: Cart & { product?: Product }): CartProductSummaryDto {
        const product = cart.product;
        const productPrice = this.toNumber(product?.price ?? cart.unitPrice);
        const mrpValue = this.toNumber(product?.mrp ?? productPrice);

        const id = String((cart as any)._id ?? (cart as any).id ?? '');
        return {
            _id: id || '',
            isActive: true,
            subcategoryId: cart.subcategoryId,
            productId: String(cart.productId),
            name: product?.name,
            description: product?.description,
            price: productPrice,
            productImage: product?.productImage,
            selectedQuantity: cart.quantity ?? 0,
            availableQuantity: this.toNumber(product?.quantity),
            mrp: mrpValue,
            totalPrice: this.toNumber(cart.totalPrice),
        };
    }

    private determineMrpPerItem(cart: Cart & { product?: Product }): number {
        const product = cart.product;
        const productPrice = this.toNumber(product?.price ?? cart.unitPrice);
        return this.toNumber(product?.mrp ?? productPrice);
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

    private extractFirstValue<T>(items: T[], selector: (item: T) => string | undefined | null): string | undefined {
        for (const item of items) {
            const value = selector(item);
            if (value !== undefined && value !== null) {
                return String(value);
            }
        }
        return undefined;
    }

    private parseNumber(value: string): number {
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

    private toNumber(value: unknown): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    private async resolveFullAddress(addressId?: string): Promise<string | undefined> {
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
        const parts = [
            address.street,
            address.city,
            address.state,
            address.country,
        ]
            .map((part) => String(part || '').trim())
            .filter((part) => part.length > 0);
        return parts.length ? parts.join(', ') : undefined;
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
