import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AuditModel, AuditSchema } from './audit.model';
import { User } from './user.model';

@Schema()
export class UserAddress extends AuditModel {
    @ApiProperty({ description: 'Street address', example: '123 Palm Street' })
    @Prop({ required: true })
    street: string;

    @ApiProperty({ description: 'City name', example: 'Doha' })
    @Prop({ required: true })
    city: string;

    @ApiProperty({ description: 'State or province', example: 'Qatar Central' })
    @Prop()
    state?: string;

    @ApiProperty({
        description: 'Delivery Location ID associated with this address',
        example: '64f1c2d9e4b1a2a3c1d2e3f4',
    })
    @Prop({ required: true })
    deliveryLocationId: string;

    @ApiProperty({ description: 'Country', example: 'Qatar' })
    @Prop({ required: true })
    country: string;

    @ApiProperty({ description: 'User ID this address belongs to', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
    @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
    userId: string;
}

export type UserAddressDocument = UserAddress & Document;
export const UserAddressSchema = SchemaFactory.createForClass(UserAddress);
UserAddressSchema.add(AuditSchema);

