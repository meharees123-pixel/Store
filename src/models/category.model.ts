import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Store } from './store.model';

@Schema()
export class Category extends AuditModel {
  @ApiProperty({ description: 'Name of the category', example: 'Vegetables' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Category short code', example: 'VEG' })
  @Prop({ required: true })
  categoryCode: string;

  @ApiProperty({ description: 'Image URL for the category', example: 'https://example.com/cat1.jpg' })
  @Prop()
  categoryImage?: string;

  @ApiProperty({ description: 'Description of the category', example: 'Fresh seasonal vegetables' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Store ID this category belongs to', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: Store.name })
  storeId: string;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);

// Add audit fields
CategorySchema.add(AuditSchema);

// ✅ Add compound index for uniqueness: storeId + categoryCode
CategorySchema.index({ storeId: 1, categoryCode: 1 }, { unique: true });