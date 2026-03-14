import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Category } from './category.model';
import { Document, SchemaTypes } from 'mongoose';
import { Store } from './store.model';

@Schema()
export class Subcategory extends AuditModel {
  @ApiProperty({ description: 'Name of the subcategory', example: 'Apples' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Description of the subcategory', example: 'Types of apples' })
  @Prop()
  description?: string;

  @ApiProperty({ description: 'Store ID this subcategory belongs to', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @Prop({ type: SchemaTypes.ObjectId, ref: Store.name })
  storeId?: string;

  @ApiProperty({
    description: 'Reference to the parent category',
    type: 'string',
    example: '60d5ec49-6c77-46e3-ba18-230f37646538',
  })
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: Category.name })
  categoryId: string;

  @ApiProperty({ description: 'Unique code for the subcategory', example: 'FRUIT-001' })
  @Prop({ required: true, unique: true })
  subcategoryCode: string;

  @ApiProperty({ description: 'Image URL for the subcategory' })
  @Prop()
  subcategoryImage?: string;

  @ApiProperty({ description: 'Whether the subcategory is active', example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);
SubcategorySchema.add(AuditSchema); // Add audit fields
export type SubcategoryDocument = Subcategory & Document;
