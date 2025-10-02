import { ApiProperty } from '@nestjs/swagger';

export class FirebaseLoginDto {
  @ApiProperty({ example: '+97412345678' })
  mobileNumber: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  firebaseToken: string;

  @ApiProperty({ required: false, example: 'Meharees' })
  name?: string;
}

export class FirebaseLogoutDto {
  @ApiProperty({ example: '+97412345678' })
  mobileNumber: string;
}