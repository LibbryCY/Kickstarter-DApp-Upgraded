import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';

@Injectable()
export class CleanupService implements OnModuleInit {
  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
  ) {}

  onModuleInit() {
    // On every hour (3600000 ms)
    setInterval(
      () => {
        this.cleanupClosedCampaigns();
      },
      3 * 24 * 60 * 60 * 1000,
    ); // 3 days
  }

  async cleanupClosedCampaigns() {
    try {
      const result = await this.campaignModel.deleteMany({
        closed: true,
        balance: { $eq: 0 },
      });

      console.log(`[CleanupService] Deleted ${result.deletedCount} campaigns`);
    } catch (error) {
      console.error('[CleanupService] Error deleting campaign:', error);
    }
  }
}
