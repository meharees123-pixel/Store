import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Store } from './store.model';

@Schema()
export class DeliveryLocation extends AuditModel {
  @ApiProperty({ description: 'Name of the delivery location', example: 'West Bay' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Postal code or zone identifier', example: 'WB123' })
  @Prop()
  zoneCode?: string;

  @ApiProperty({ description: 'Additional notes or instructions', example: 'Near metro station' })
  @Prop()
  notes?: string;

  @ApiProperty({ description: 'Store ID this location belongs to', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: Store.name })
  storeId: string;
}

export type DeliveryLocationDocument = DeliveryLocation & Document;
export const DeliveryLocationSchema = SchemaFactory.createForClass(DeliveryLocation);
DeliveryLocationSchema.add(AuditSchema);

// Compound index to ensure unique location per store
DeliveryLocationSchema.index({ storeId: 1, name: 1 }, { unique: true });