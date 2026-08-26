import { Module } from '@nestjs/common';
import { Web3Controller } from './web3.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignModule } from 'src/campaign/campaign.module';
import { EventListenerService } from './event-listener.service';
import {
  Contribution,
  ContributionSchema,
} from 'src/schemas/Contributio.schema';

@Module({
  imports: [
    CampaignModule,
    MongooseModule.forFeature([
      { name: Contribution.name, schema: ContributionSchema },
    ]),
  ],
  controllers: [Web3Controller],
  providers: [EventListenerService],
})
export class Web3Module {}
