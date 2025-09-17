import { ApiProperty } from '@nestjs/swagger';

export class DeliveryLocationDto {
    @ApiProperty({ description: 'Name of the delivery location' })
    name: string;

    @ApiProperty({ description: 'Zone code or postal identifier', required: false })
    zoneCode?: string;

    @ApiProperty({ description: 'Additional notes or instructions', required: false })
    notes?: string;

    @ApiProperty({ description: 'Store ID this location belongs to', example: '64f1c2d9e4b1a2a3c1d2e3f4' })
    storeId: string;

    @ApiProperty()
    isActive: boolean;
}

export class CreateDeliveryLocationDto extends DeliveryLocationDto { }

export class UpdateDeliveryLocationDto extends DeliveryLocationDto { }

export class DeliveryLocationResponseDto extends DeliveryLocationDto {
    @ApiProperty()
    _id: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    isActive: boolean;
}