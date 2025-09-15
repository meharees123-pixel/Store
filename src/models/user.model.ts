import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';

@Schema()
export class User extends AuditModel {
  @ApiProperty({ description: 'Full name of the user' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Email address' })
  @Prop({ required: true, unique: true })
  email: string;

  @ApiProperty({ description: 'Password (hashed)' })
  @Prop({ required: true })
  password: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.add(AuditSchema); // Add audit fields