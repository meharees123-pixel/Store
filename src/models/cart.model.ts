import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { User } from './user.model';
import { DeliveryLocation } from './delivery-location.model';
import { Category } from './category.model';
import { Subcategory } from './subcategory.model';
import { Product } from './product.model';

@Schema()
export class Cart extends AuditModel {
  @ApiProperty({ description: 'User ID who owns the cart' })
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  userId: string;

  @ApiProperty({ description: 'User address ID for delivery' })
  @Prop({ type: SchemaTypes.ObjectId, ref: DeliveryLocation.name })
  addressId: string;

  @ApiProperty({ description: 'Subcategory ID of the product' })
  @Prop({ type: SchemaTypes.ObjectId, ref: Subcategory.name })
  subcategoryId: string;

  @ApiProperty({ description: 'Product ID added to cart' })
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true })
  productId: string;

  @ApiProperty({ description: 'Quantity of the product', example: 2 })
  @Prop({ required: true, default: 1 })
  quantity: number;

  @ApiProperty({ description: 'Price per unit at time of cart addition', example: 19.99 })
  @Prop({ required: true })
  unitPrice: number;

  @ApiProperty({ description: 'Total price for this cart item', example: 39.98 })
  @Prop({ required: true })
  totalPrice: number;
}

export type CartDocument = Cart & Document;
export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.add(AuditSchema);