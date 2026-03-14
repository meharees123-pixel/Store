import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateAppSettingsDto,
  UpdateAppSettingsDto,
} from '../dto/app-settings.dto';
import { AppSettings } from '../models/app-settings.model';

@Injectable()
export class AppSettingsService implements OnModuleInit {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(
    @InjectModel(AppSettings.name)
    private readonly settingsModel: Model<AppSettings & Document>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Ensure MongoDB indexes match the schema.
    // This drops old indexes like the legacy unique `key_1` and creates the compound unique `{ storeId, key }` index.
    try {
      await (this.settingsModel as any).syncIndexes();
    } catch (e: any) {
      this.logger.warn(`Failed to sync AppSettings indexes: ${String(e?.message || e)}`);
    }
  }

  async create(dto: CreateAppSettingsDto): Promise<AppSettings & Document> {
    return this.settingsModel.create(dto);
  }

  async findScopedByKey(params: { key: string; storeId: string }): Promise<(AppSettings & Document) | null> {
    const key = params.key?.trim();
    const storeId = params.storeId?.trim();
    if (!key || !storeId) return null;

    // Preferred (ObjectId-typed storeId)
    const scoped = await this.settingsModel.findOne({ key, storeId }).exec();
    if (scoped) return scoped;

    // Legacy fallback: some DBs may have stored storeId as a string, not ObjectId.
    try {
      const raw = await (this.settingsModel as any).collection.findOne({ key, storeId });
      return raw ? (this.settingsModel as any).hydrate(raw) : null;
    } catch {
      return null;
    }
  }

  async findGlobalByKey(key: string): Promise<(AppSettings & Document) | null> {
    const k = key?.trim();
    if (!k) return null;

    const global = await this.settingsModel
      .findOne({
        key: k,
        $or: [{ storeId: { $exists: false } }, { storeId: null }],
      })
      .exec();
    if (global) return global;

    // Legacy fallback: `storeId` stored as empty string.
    try {
      const raw = await (this.settingsModel as any).collection.findOne({ key: k, storeId: '' });
      return raw ? (this.settingsModel as any).hydrate(raw) : null;
    } catch {
      return null;
    }
  }

  async findByKeyWithFallback(params: {
    key: string;
    storeId?: string | null;
  }): Promise<(AppSettings & Document) | null> {
    const key = params.key?.trim();
    if (!key) return null;

    const storeId = params.storeId ? String(params.storeId).trim() : '';
    if (storeId) {
      const scoped = await this.findScopedByKey({ key, storeId });
      if (scoped) return scoped;
    }

    return this.findGlobalByKey(key);
  }

  async findAll(): Promise<AppSettings[]> {
    return this.settingsModel.find().exec();
  }

  async findAllByStore(storeId: string): Promise<AppSettings[]> {
    return this.settingsModel.find({ storeId }).exec();
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
