import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true }) // Handles createdAt/updatedAt
export class AuditModel {
  @ApiProperty({ description: 'Date and time when the document was created' })
  @Prop()
  createdAt: Date;

  @ApiProperty({ description: 'Date and time when the document was last updated' })
  @Prop()
  updatedAt: Date;

  @ApiProperty({ description: 'ID of the user who created the document' })
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy: string;

  @ApiProperty({ description: 'ID of the user who last updated the document' })
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  updatedBy: string;

  @ApiProperty({ description: 'Indicates whether the document is active', example: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const AuditSchema = SchemaFactory.createForClass(AuditModel);