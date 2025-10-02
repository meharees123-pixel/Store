import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateAppSettingsDto,
  UpdateAppSettingsDto,
} from '../dto/app-settings.dto';
import { AppSettings } from '../models/app-settings.model';

@Injectable()
export class AppSettingsService {
  constructor(
    @InjectModel(AppSettings.name)
    private readonly settingsModel: Model<AppSettings & Document>,
  ) {}

  async create(dto: CreateAppSettingsDto): Promise<AppSettings & Document> {
    return this.settingsModel.create(dto);
  }

  async findAll(): Promise<AppSettings[]> {
    return this.settingsModel.find().exec();
  }

  async findOne(id: string): Promise<AppSettings & Document> {
    const setting = await this.settingsModel.findById(id).exec();
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async update(id: string, dto: UpdateAppSettingsDto): Promise<AppSettings & Document> {
    const updated = await this.settingsModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Setting not found');
    return updated;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.settingsModel.findByIdAndDelete(id).exec();
    return { deleted: !!deleted };
  }
}