import { ApiProperty } from '@nestjs/swagger';
export class CartDto {
    @ApiProperty()
    userId: string;

    @ApiProperty({ required: false })
    userAddressId?: string;

    @ApiProperty({ required: false })
    categoryId?: string;

    @ApiProperty({ required: false })
    subcategoryId?: string;

    @ApiProperty()
    productId: string;

    @ApiProperty({ example: 2 })
    quantity: number;

    @ApiProperty({ example: 19.99 })
    unitPrice: number;

    @ApiProperty({ example: 39.98 })
    totalPrice: number;

    @ApiProperty()
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