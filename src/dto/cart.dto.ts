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
