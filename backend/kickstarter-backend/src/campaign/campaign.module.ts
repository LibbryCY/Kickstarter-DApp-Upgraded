import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from 'src/schemas/Campaign.schema';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { AuthModule } from 'src/auth/auth.module';
import {
  Contribution,
  ContributionSchema,
} from 'src/schemas/Contributio.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Contribution.name, schema: ContributionSchema },
    ]),
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
    ]),
  ],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [MongooseModule],
})
export class CampaignModule {}
