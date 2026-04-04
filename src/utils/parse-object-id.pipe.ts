import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export class ParseObjectIdPipe implements PipeTransform<string | undefined> {
  transform(value: string | undefined, metadata: ArgumentMetadata) {
    if (value === undefined || value === null) {
      return value;
    }
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid MongoDB ObjectId: ${value}`);
    }
    return value; // Or return new Types.ObjectId(value) if needed
  }
}
