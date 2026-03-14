import { ApiProperty } from '@nestjs/swagger';

export class FirebaseLoginDto {
  @ApiProperty({ example: '+97412345678' })
  mobileNumber: string;

  @ApiProperty({ required: false, example: 'Meharees' })
  name?: string;
}

export class FirebaseLogoutDto {
  @ApiProperty({ example: '+97412345678' })
  mobileNumber: string;
}

export class FirebaseLoginInfoDto {
  @ApiProperty({ example: '+97412345678' })
  mobileNumber: string;
}

export class UserDto {
  @ApiProperty({ required: false, example: 'Meharees' })
  name?: string;

  @ApiProperty({ required: false, example: 'meharees@example.com' })
  email?: string;

  @ApiProperty({ example: '+97412345678' })
  mobileNumber: string;

  @ApiProperty({ required: false, example: true })
  isActive?: boolean;
}

export class CreateUserDto extends UserDto {}

export class UpdateUserDto extends UserDto {}

export class UserResponseDto extends UserDto {
  @ApiProperty({ description: 'MongoDB document ID' })
  _id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
