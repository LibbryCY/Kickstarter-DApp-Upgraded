import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers, JsonRpcProvider } from 'ethers';
import * as dotenv from 'dotenv';
import {
  Campaign,
  CampaignDocument,
  CampaignSchema,
} from 'src/schemas/Campaign.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ABI } from '../common/abi';
import {
  updateLastProcessedBlock,
  getLastProcessedBlock,
} from '../common/utils';

dotenv.config();
const rpcUrl = process.env.RPC_URL || '';
const contractAddress = process.env.CONTRACT_ADDRESS || '';

// Polling interval in milliseconds , for JsonRpcProvider

@Injectable()
export class Web3Service implements OnModuleInit {
  private provider: JsonRpcProvider;
  private contract: ethers.Contract;

  private contractAbi = ABI;

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
  ) {
    console.log('RPC URL:', rpcUrl);
    console.log('Contract Address:', contractAddress);

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(
      contractAddress,
      this.contractAbi,
      this.provider,
    );

    //this.listenToEvents();
  }
  async onModuleInit() {
    await this.listenToEvents();
  }

  async listenToEvents() {
    const filter = {}; // this.contract.filters.CampaignCreated();
    let lastProcessedBlock = getLastProcessedBlock();

    // Polling every 10 seconds for new events
    setInterval(async () => {
      try {
        const latestBlock = await this.provider.getBlockNumber();

        // Ako već imamo najnoviji blok, nema potrebe za novim upitom
        if (latestBlock <= lastProcessedBlock) return;

        const batchSize = 5000; // Broj blokova po upitu
        let fromBlock = lastProcessedBlock + 1;

        while (fromBlock <= latestBlock) {
          const toBlock = Math.min(fromBlock + batchSize - 1, latestBlock);
          const logs = await this.provider.getLogs({
            ...filter,
            fromBlock: fromBlock,
            toBlock: toBlock,
          });
          if (logs.length > 0) {
            logs.forEach(async (log) => {
              const parsedLog = this.contract.interface.parseLog(log);
              if (!parsedLog) {
                console.error('Failed to parse log:', log);
                return;
              }
              const event = parsedLog.args;
              console.log(
                `Event found: ${parsedLog.name} in block ${log.blockNumber}`,
              );

              // Switch to choose which event was emited
              if (parsedLog.name === 'Voted') {
                console.log(
                  `Vote: Voter = ${event.voter}, Campaign ID = ${event.campaignId}, value = ${event.amount}`,
                );
                const existingCampaign = await this.campaignModel.findOne({
                  id: Number(event.campaignId),
                });
                if (existingCampaign) {
                  await this.campaignModel.findOneAndUpdate(
                    { id: Number(event.campaignId) },
                    {
                      $inc: { balance: Number(event.amount), numberOfVotes: 1 },
                    },
                  );
                }
              }

              if (parsedLog.name == 'CampaignCreated') {
                const existingCampaign = await this.campaignModel.findOne({
                  id: Number(event.campaignId),
                });

                if (!existingCampaign) {
                  const newCampaign = new this.campaignModel({
                    id: Number(event.campaignId),
                    creator: String(event.creator),
                    threshold: String(event.threshold), // to convert from wei to ether
                    balance: 0,
                    beneficiary: event.beneficiary,
                    numberOfVotes: 0,
                    closed: false,
                  });

                  await newCampaign.save();
                }
              }

              if (parsedLog.name == 'Unvoted') {
                console.log(
                  `Unvote: Voter = ${event.voter}, Campaign ID = ${event.campaignId}, value = ${event.amount}`,
                );

                const existingCampaign = await this.campaignModel.findOne({
                  id: Number(event.campaignId),
                });
                if (existingCampaign) {
                  await this.campaignModel.findOneAndUpdate(
                    { id: Number(event.campaignId) },
                    {
                      $inc: {
                        balance: -Number(event.amount),
                        numberOfVotes: -1,
                      },
                    },
                  );
                }
              }

              if (parsedLog.name == 'CampaignClosed') {
                console.log(
                  `Campaign Closed: ID = ${event.campaignId}, amount transferred = ${event.amountTransferred}`,
                );
                const existingCampaign = await this.campaignModel.findOne({
                  id: Number(event.campaignId),
                });
                if (existingCampaign) {
                  await this.campaignModel.findOneAndUpdate(
                    { id: Number(event.campaignId) },
                    { closed: true, numberOfVotes: 0 },
                    { $inc: { balance: -Number(event.amountTransferred) } },
                  );
                }
              }

              if (parsedLog.name == 'FundsClaimed') {
                console.log(`Funds Claimed: amount = ${event.fundsToClaim}`);
                await this.campaignModel.updateMany(
                  { closed: true },
                  { $set: { balance: 0 } },
                );
              }

              // Update last processed block
              fromBlock = toBlock + 1;

              lastProcessedBlock = log.blockNumber;
              await updateLastProcessedBlock(lastProcessedBlock);
            });
          }
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    }, 5000); // Poll every 10 seconds
  }
}
