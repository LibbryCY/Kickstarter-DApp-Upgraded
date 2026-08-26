import { Module } from '@nestjs/common';

import { Web3Module } from './web3/web3.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignModule } from './campaign/campaign.module';


import * as dotenv from 'dotenv';
import { CampaignController } from './campaign/campaign.controller';
import { CleanupModule } from './cleanup/cleanup.module';
import { AuthModule } from './auth/auth.module';
dotenv.config();

const DB_URL = process.env.DB_URL || 'mongodb://localhost:27017/';


@Module({
  imports: [Web3Module,MongooseModule.forRoot(DB_URL) ,CampaignModule, CleanupModule, AuthModule],
  controllers: [],
  providers: [],
})

export class AppModule {

}
