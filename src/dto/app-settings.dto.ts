import { ApiProperty } from '@nestjs/swagger';

export class CreateAppSettingsDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  value: string;

  @ApiProperty({ required: false })
  description?: string;
}

export class UpdateAppSettingsDto {
  @ApiProperty({ required: false })
  value?: string;

  @ApiProperty({ required: false })
  description?: string;
}

export class AppSettingsResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isActive: boolean;
}