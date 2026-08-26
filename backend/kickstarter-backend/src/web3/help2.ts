// src/events/event-listener.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { ABI } from '../common/abi';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from 'src/schemas/Campaign.schema';
import {
  Contribution,
  ContributionDocument,
} from 'src/schemas/Contributio.schema';

dotenv.config();
const rpcWS = process.env.RPC_WS || '';
const contractAddress = process.env.CONTRACT_ADDRESS || '';

@Injectable()
export class EventListenerService implements OnModuleInit {
  private provider: ethers.WebSocketProvider;
  private contract: ethers.Contract;

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(Contribution.name)

    private contributionModel: Model<ContributionDocument>,
  ) {
    this.provider = new ethers.WebSocketProvider(rpcWS);
    this.contract = new ethers.Contract(contractAddress, ABI, this.provider);
  }


  private async syncCampaignFromChain(campaignId: number) {
    const onChain = await this.contract.getCampaign(campaignId);
    await this.campaignModel.findOneAndUpdate(
      { id: campaignId },
      {
        $set: {
          creator: onChain.creator,
          threshold: onChain.threshold.toString(),
          balance: onChain.balance.toString(),
          beneficiary: onChain.beneficiary,
          numberOfVotes: Number(onChain.numberOfVotes),
          closed: onChain.closed,
          goalReached: onChain.goalReached,
          flexibleFunding: onChain.flexibleFunding,
        },
        $setOnInsert: { id: campaignId, name: '', description: '' },
      },
      { upsert: true }
    );
  }
  
  private async syncContribution(voter: string, campaignId: number) {
    const amount: bigint = await this.contract.votes(voter, campaignId);
    await this.contributionModel.findOneAndUpdate(
      { voter: voter.toLowerCase(), campaignId },
      { $set: { amount: amount.toString() } },
      { upsert: true }
    );
  }

  onModuleInit() {
    this.contract.on(
      'CampaignCreated',
      async (campaignId, creator, threshold, beneficiary) => {
        await this.campaignModel.findOneAndUpdate(
          { id: Number(campaignId) },
          {
            $set: {
              id: Number(campaignId),
              creator: String(creator),
              threshold: threshold.toString(),
              beneficiary: beneficiary,
              closed: false,
            },
            $setOnInsert: {
              balance: '0',
              numberOfVotes: 0,
              name: '',
              description: '',
            },
          },
          { upsert: true },
        );
      },
    );

    this.contract.on('Voted', async (campaignId, voter, amount) => {
      const existingCampaign = await this.campaignModel.findOne({ id: Number(campaignId) });
      if (existingCampaign) {
        const newBalance = (BigInt(existingCampaign.balance) + BigInt(amount)).toString();
        await this.campaignModel.findOneAndUpdate(
          { id: Number(campaignId) },
          { balance: newBalance, $inc: { numberOfVotes: 1 } }
        );
      }
    
      const voterAddr = String(voter).toLowerCase();
      const existingContribution = await this.contributionModel.findOne({
        voter: voterAddr,
        campaignId: Number(campaignId),
      });
      const newContribution = existingContribution
        ? (BigInt(existingContribution.amount) + BigInt(amount)).toString()
        : amount.toString();
    
      await this.contributionModel.findOneAndUpdate(
        { voter: voterAddr, campaignId: Number(campaignId) },
        { $set: { amount: newContribution } },
        { upsert: true }
      );
    });
    
    this.contract.on('Unvoted', async (campaignId, voter, amount) => {
      const existingCampaign = await this.campaignModel.findOne({ id: Number(campaignId) });
      if (existingCampaign) {
        const newBalance = (BigInt(existingCampaign.balance) - BigInt(amount)).toString();
        await this.campaignModel.findOneAndUpdate(
          { id: Number(campaignId) },
          { balance: newBalance, $inc: { numberOfVotes: -1 } }
        );
      }
    
      // unvote na contractu uvek povlači CEO ulog (nema partial unvote), pa se resetuje na 0
      await this.contributionModel.findOneAndUpdate(
        { voter: String(voter).toLowerCase(), campaignId: Number(campaignId) },
        { $set: { amount: '0' } }
      );
    });

    
    this.contract.on(
      'CampaignClosed',
      async (campaignId, amountTransferred) => {
        await this.campaignModel.findOneAndUpdate(
          { id: Number(campaignId) },
          { closed: true, numberOfVotes: 0, balance: '0' },
        );
      },
    );

    this.contract.on('FundsClaimed', async (fundsToClaim) => {
      console.log(`Funds Claimed: amount = ${fundsToClaim}`);
      await this.campaignModel.updateMany(
        { closed: true },
        { $set: { balance: '0' } },
      );
    });
  }
}
