import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Category } from './category.model';
import { Document, SchemaTypes } from 'mongoose';

@Schema()
export class Subcategory extends AuditModel {
  @ApiProperty({ description: 'Name of the subcategory', example: 'Apples' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Description of the subcategory', example: 'Types of apples' })
  @Prop()
  description?: string;

  @ApiProperty({
    description: 'Reference to the parent category',
    type: 'string',
    example: '60d5ec49-6c77-46e3-ba18-230f37646538',
  })
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: Category.name })
  categoryId: string;

  @ApiProperty({ description: 'Image URL for the subcategory' })
  @Prop()
  subcategoryImage?: string;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);
SubcategorySchema.add(AuditSchema); // Add audit fields
export type SubcategoryDocument = Subcategory & Document;