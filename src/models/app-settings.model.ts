import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';

@Schema()
export class AppSettings extends AuditModel {
  @ApiProperty({ description: 'Setting key', example: 'siteTitle' })
  @Prop({ required: true, unique: true })
  key: string;

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