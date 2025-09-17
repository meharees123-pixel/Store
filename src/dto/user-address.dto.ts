import { ApiProperty } from '@nestjs/swagger';
export class UserAddressDto {
    @ApiProperty({ description: 'Street address' })
    street: string;

    @ApiProperty({ description: 'City name' })
    city: string;

    @ApiProperty({ description: 'State or province', required: false })
    state?: string;

    @ApiProperty({
        description: 'Delivery Location ID associated with this address',
        example: '64f1c2d9e4b1a2a3c1d2e3f4',required: true
    })
    deliveryLocationId: string;

    @ApiProperty({ description: 'Country' })
    country: string;

    @ApiProperty({ description: 'User ID this address belongs to',example: '64f1c2d9e4b1a2a3c1d2e3f4',required: true })
    userId: string;

    @ApiProperty()
    isActive: boolean;
}

export class CreateUserAddressDto extends UserAddressDto { }

export class UpdateUserAddressDto extends UserAddressDto { }

export class UserAddressResponseDto extends UserAddressDto {
    @ApiProperty()
    _id: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

}