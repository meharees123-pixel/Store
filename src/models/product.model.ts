import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Category } from './category.model';
import { Subcategory } from './subcategory.model';
import { Store } from './store.model';

@Schema()
export class Product extends AuditModel {
  @ApiProperty({ description: 'Product name', example: 'iPhone 15' })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({ description: 'Product description', example: 'Latest smartphone' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Product price', example: 999.99 })
  @Prop({ required: true })
  price: number;

  @ApiProperty({ description: 'Product image URL', example: 'https://example.com/iphone.jpg' })
  @Prop()
  productImage?: string;

  @ApiProperty({ description: 'Available quantity in stock', example: 100 })
  @Prop({ required: true, default: 0 })
  quantity: number;

  @ApiProperty({ description: 'Store ID this product belongs to', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @Prop({ type: SchemaTypes.ObjectId, ref: Store.name })
  storeId?: string;


  @ApiProperty({ description: 'Reference to parent category', example: '68c467b88f1124a8b0fcd2b3' })
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: Category.name })
  categoryId: string;

  @ApiProperty({ description: 'Reference to parent subcategory', example: '68c467b88f1124a8b0fcd2b3' })
  @Prop({ type: SchemaTypes.ObjectId, ref: Subcategory.name })
  subcategoryId?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.add(AuditSchema); // Add audit fields

// Enable fast global search on common text fields.
ProductSchema.index({ name: 'text', description: 'text' });
export type ProductDocument = Product & Document;
