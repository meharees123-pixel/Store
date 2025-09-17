// src/dtos/store.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class StoreDto {
    @ApiProperty({ example: 'Marketplace A' })
    name: string;

    @ApiProperty({ example: '123 Main St' })
    location: string;

    @ApiProperty()
    isActive: boolean;
}

export class CreateStoreDto extends StoreDto { }

export class UpdateStoreDto extends StoreDto { }

export class StoreResponseDto extends StoreDto {
    @ApiProperty({ description: 'MongoDB document ID' })
    _id: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}