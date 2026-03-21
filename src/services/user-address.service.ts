import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateUserAddressDto,
  UpdateUserAddressDto,
} from '../dto/user-address.dto';
import { UserAddress } from '../models/user-address.model';

@Injectable()
export class UserAddressService {
  constructor(
    @InjectModel(UserAddress.name)
    private readonly addressModel: Model<UserAddress & Document>,
  ) {}

  async create(dto: CreateUserAddressDto): Promise<UserAddress & Document> {
    return this.addressModel.create(dto);
  }

  async findAll(storeId?: string): Promise<UserAddress[]> {
    const filter = storeId ? { storeId } : {};
    return this.addressModel.find(filter).exec();
  }

  async findByUser(userId: string, storeId?: string): Promise<UserAddress[]> {
    const filter: Record<string, unknown> = { userId };
    if (storeId) {
      filter.storeId = storeId;
    }
    return this.addressModel.find(filter).exec();
  }

  async findOne(id: string): Promise<UserAddress & Document> {
    return this.addressModel.findById(id).exec();
  }

  async update(id: string, dto: UpdateUserAddressDto): Promise<UserAddress & Document> {
    return this.addressModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.addressModel.findByIdAndDelete(id).exec();
    return { deleted: !!deleted };
  }
}
