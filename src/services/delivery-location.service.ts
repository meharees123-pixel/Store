import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateDeliveryLocationDto,
  UpdateDeliveryLocationDto,
} from '../dto/delivery-location.dto';
import { DeliveryLocation } from '../models/delivery-location.model';

@Injectable()
export class DeliveryLocationService {
  constructor(
    @InjectModel(DeliveryLocation.name)
    private readonly locationModel: Model<DeliveryLocation & Document>,
  ) {}

  async create(
    createDeliveryLocationDto: CreateDeliveryLocationDto,
  ): Promise<DeliveryLocation & Document> {
    return this.locationModel.create(createDeliveryLocationDto);
  }

  async findAll(): Promise<DeliveryLocation[]> {
    return this.locationModel.find().exec();
  }

  async findByStore(storeId: string): Promise<DeliveryLocation[]> {
    return this.locationModel.find({ storeId }).exec();
  }

  async findOne(id: string): Promise<DeliveryLocation & Document> {
    return this.locationModel.findById(id).exec();
  }

  async update(
    id: string,
    updateDeliveryLocationDto: UpdateDeliveryLocationDto,
  ): Promise<DeliveryLocation & Document> {
    return this.locationModel
      .findByIdAndUpdate(id, updateDeliveryLocationDto, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deletedDocument = await this.locationModel.findByIdAndDelete(id).exec();
    return { deleted: !!deletedDocument };
  }
}