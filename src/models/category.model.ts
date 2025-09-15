import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';

@Schema()
export class Category extends AuditModel {
  @ApiProperty({ description: 'Name of the category', example: 'Vegetables' })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({ description: 'Category short code', example: 'VEG' })
  @Prop({ required: true, unique: true })
  categoryCode: string;

  @ApiProperty({ description: 'Image URL for the category', example: 'https://example.com/cat1.jpg' })
  @Prop()
  categoryImage?: string;

  @ApiProperty({ description: 'Description of the category', example: 'Fresh seasonal vegetables' })
  @Prop()
  description?: string;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.add(AuditSchema); // Add audit fields