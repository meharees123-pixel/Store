import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Store, StoreDocument } from '../models/store.model';
import { CreateStoreDto, UpdateStoreDto } from '../dto/store.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
  ) {}

  async create(createStoreDto: CreateStoreDto, userId: string): Promise<StoreDocument> {
    try {
      const store = new this.storeModel({
        ...createStoreDto,
        createdBy: userId,
        updatedBy: userId,
      });
      return await store.save();
    } catch (error) {
      throw new InternalServerErrorException('Error creating store');
    }
  }

  async findAll(): Promise<StoreDocument[]> {
    return this.storeModel.find().exec();
  }

  async findOne(id: string): Promise<StoreDocument> {
    const objectId = new Types.ObjectId(id);
    const store = await this.storeModel.findById(objectId).exec();
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  async update(id: string, updateStoreDto: UpdateStoreDto, userId: string): Promise<StoreDocument> {
    const objectId = new Types.ObjectId(id);
    const updated = await this.storeModel
      .findByIdAndUpdate(
        objectId,
        {
          ...updateStoreDto,
          updatedBy: userId,
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Store not found');
    }

    return updated;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const objectId = new Types.ObjectId(id);
    const deletedDocument = await this.storeModel.findByIdAndDelete(objectId).exec();
    return { deleted: !!deletedDocument };
  }
}