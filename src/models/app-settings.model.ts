import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { Store } from './store.model';

@Schema()
export class AppSettings extends AuditModel {
  @ApiProperty({ description: 'Setting key', example: 'siteTitle' })
  @Prop({ required: true })
  key: string;

  @ApiProperty({ description: 'Optional store scope (omit for global setting)', required: false })
  @Prop({ required: false, type: SchemaTypes.ObjectId, ref: Store.name })
  storeId?: string;

  @ApiProperty({ description: 'Setting value', example: 'My Store Platform' })
  @Prop({ required: true })
  value: string;

  @ApiProperty({ description: 'Optional description of the setting' })
  @Prop()
  description?: string;
}

export type AppSettingsDocument = AppSettings & Document;
export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
AppSettingsSchema.add(AuditSchema);

// Allow same key for different stores, but enforce uniqueness within a store (and for global settings).
AppSettingsSchema.index({ storeId: 1, key: 1 }, { unique: true });
