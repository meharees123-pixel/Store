import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { User } from './user.model';
import { UserAddress } from './user-address.model';
import { Store } from './store.model';
import { OrderStatus } from '../constants/order-status';
import { DeliveryLocation } from './delivery-location.model';
@Schema()
export class Order extends AuditModel {
  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  userId: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId, ref: UserAddress.name, required: true })
  userAddressId: string;

  @ApiProperty({ required: false })
  @Prop({ type: SchemaTypes.ObjectId, ref: DeliveryLocation.name })
  deliveryLocationId?: string;

  @ApiProperty()
  @Prop({ type: SchemaTypes.ObjectId, ref: Store.name, required: true })
  storeId: string;

  @ApiProperty({ enum: OrderStatus, default: OrderStatus.PENDING })
  @Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @ApiProperty({ example: 99.99 })
  @Prop({ required: true })
  totalAmount: number;

  @ApiProperty({ description: 'Cart items snapshot at time of order' })
  @Prop({ type: [Object], required: true })
  items: any[];

  @ApiProperty()
  @Prop()
  deliveryTime?: string;

  @ApiProperty()
  @Prop()
  deliveryCharge?: string;

  @ApiProperty()
  @Prop()
  handlingCharge?: string;

  @ApiProperty()
  @Prop()
  TotalSaving?: string;

  @ApiProperty()
  @Prop()
  TatalBill?: string;
}

export type OrderDocument = Order & Document;
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.add(AuditSchema);
