import { ApiProperty } from '@nestjs/swagger';
export class CartDto {
    @ApiProperty()
    userId: string;

    @ApiProperty({ description: 'Store ID', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
    storeId: string;

    @ApiProperty({ required: false })
    addressId?: string;

    @ApiProperty({ required: false, description: 'User address id for delivery' })
    userAddressId?: string;

    @ApiProperty({ required: false, description: 'Delivery location id for this store' })
    deliveryLocationId?: string;

    @ApiProperty()
    productId: string;

    @ApiProperty({ example: 2 })
    quantity: number;

    @ApiProperty({ required: false ,example: 19.99 })
    unitPrice: number;

    @ApiProperty({ required: false ,example: 39.98 })
    totalPrice: number;

    @ApiProperty({ required: false })
    isActive: boolean;
}

export class CreateCartDto extends CartDto { }

export class UpdateCartDto extends CartDto { }

export class CartResponseDto extends CartDto {
    @ApiProperty()
    _id: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    isActive: boolean;
}

export class CartWithProductResponseDto extends CartResponseDto {
    @ApiProperty({ type: Object, required: false })
    product?: any;
}

export class CartProductSummaryDto {
    @ApiProperty({ description: 'Cart item ID' })
    _id: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty({ required: false })
    subcategoryId?: string;

    @ApiProperty()
    productId: string;

    @ApiProperty({ required: false })
    name?: string;

    @ApiProperty({ required: false })
    description?: string;

    @ApiProperty({ required: false })
    price?: number;

    @ApiProperty({ required: false })
    productImage?: string;

    @ApiProperty()
    selectedQuantity: number;

    @ApiProperty()
    availableQuantity: number;

    @ApiProperty({ required: false })
    mrp?: number;

    @ApiProperty()
    totalPrice: number;
}

export class CartSummaryDto {
    @ApiProperty()
    userId: string;

    @ApiProperty()
    storeId: string;

    @ApiProperty({ required: false })
    userAddressId?: string;

    @ApiProperty({ required: false, description: 'Computed full address string for the selected user address' })
    userAddressFull?: string;

    @ApiProperty({ required: false })
    deliveryLocationId?: string;

    @ApiProperty({ required: false })
    addressId?: string;

    @ApiProperty()
    deliveryTime: string;

    @ApiProperty()
    deliveryCharge: string;

    @ApiProperty()
    handlingCharge: string;

    @ApiProperty({ description: 'Total savings computed as sum(MRP) - sum(totalPrice)' })
    TotalSaving: string;

    @ApiProperty({ description: 'Total bill including delivery and handling charges' })
    TatalBill: string;

    @ApiProperty({ type: [CartProductSummaryDto] })
    products: CartProductSummaryDto[];
}
