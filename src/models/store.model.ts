// src/models/store.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Document, SchemaTypes } from 'mongoose';

@Schema()
export class Store extends AuditModel {
  @ApiProperty({ description: 'Name of the store', example: 'Marketplace A' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Store location', example: '123 Main St' })
  @Prop({ required: true })
  location: string;
}

export type StoreDocument = Store & Document;
export const StoreSchema = SchemaFactory.createForClass(Store);
StoreSchema.add(AuditSchema); // Add audit fields

