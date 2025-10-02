import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../constants/order-status';

export class CreateOrderDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userAddressId: string;

  @ApiProperty()
  storeId: string;
}

export class OrderItemUpdateDto {
  @ApiProperty()
  productId: string;

  @ApiProperty({ required: false })
  quantity?: number;

  @ApiProperty({ required: false })
  remove?: boolean;
}

export class UpdateOrderDto {
  @ApiProperty({ enum: OrderStatus, required: false })
  status?: OrderStatus;

  @ApiProperty({ required: false })
  userAddressId?: string;

  @ApiProperty({ required: false, type: [OrderItemUpdateDto] })
  items?: OrderItemUpdateDto[];
}

export class OrderResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  userAddressId: string;

  @ApiProperty()
  storeId: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: 99.99 })
  totalAmount: number;

  @ApiProperty({ type: [Object] })
  items: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isActive: boolean;
}