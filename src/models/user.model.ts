import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';

@Schema()
export class User extends AuditModel {
  @ApiProperty({ description: 'Full name of the user', example: 'Meharees' })
  @Prop()
  name?: string;

  @ApiProperty({ description: 'Email address', example: 'meharees@example.com' })
  @Prop({ unique: true, sparse: true })
  email?: string;

  @ApiProperty({ description: 'Mobile number used for Firebase login', example: '+97412345678' })
  @Prop({ required: true, unique: true })
  mobileNumber: string;

  @ApiProperty({ description: 'Firebase auth token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @Prop()
  firebaseToken?: string;

  @ApiProperty({ description: 'User status: active or logged out', example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.add(AuditSchema);