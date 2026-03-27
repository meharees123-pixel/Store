import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../constants/order-status';
import { CartProductSummaryDto } from './cart.dto';

export class CreateOrderDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userAddressId: string;

  @ApiProperty({ required: false })
  deliveryLocationId?: string;

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

  @ApiProperty({ required: false })
  deliveryLocationId?: string;

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

  @ApiProperty({ required: false })
  deliveryLocationId?: string;

  @ApiProperty()
  storeId: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: 99.99 })
  totalAmount: number;

  @ApiProperty()
  deliveryTime: string;

  @ApiProperty()
  deliveryCharge: string;

  @ApiProperty()
  handlingCharge: string;

  @ApiProperty()
  TotalSaving: string;

  @ApiProperty()
  TatalBill: string;

  @ApiProperty({ type: [Object] })
  items: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isActive: boolean;
}

export class OrderSummaryDto {
  @ApiProperty()
  orderId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  storeId: string;

  @ApiProperty({ required: false })
  userAddressId?: string;

  @ApiProperty({ required: false })
  deliveryLocationId?: string;

  @ApiProperty({ required: false, description: 'Full address line for the selected user address' })
  userAddressFull?: string;

  @ApiProperty()
  deliveryTime: string;

  @ApiProperty()
  deliveryCharge: string;

  @ApiProperty()
  handlingCharge: string;

  @ApiProperty({ description: 'Sum of MRPs minus sum of total prices' })
  TotalSaving: string;

  @ApiProperty({ description: 'Total bill including delivery and handling charges' })
  TatalBill: string;

  @ApiProperty({ type: [CartProductSummaryDto] })
  products: CartProductSummaryDto[];
}
