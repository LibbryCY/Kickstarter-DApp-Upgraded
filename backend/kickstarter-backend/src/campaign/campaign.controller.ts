import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  NotFoundException,
  Body,
  Patch,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  async getAllCampaigns() {
    return this.campaignService.getAllCampaigns();
  }

  @Get('contributions/mine')
  async getMyContributions(@Query('address') address: string) {
    return this.campaignService.getContributionsByVoter(address);
  }

  @Get('stats/summary')
  async getStats() {
    return this.campaignService.getStatistics();
  }

  @Get(':id')
  async getCampaignById(@Param('id') id: string) {
    const campaign = await this.campaignService.getById(Number(id));
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  @Patch(':id/metadata')
  async updateMetadata(
    @Param('id') id: string,
    @Body() body: { name: string; description: string },
  ) {
    console.log(`Updating metadata for campaign ${id}:`, body);
    return this.campaignService.updateMetadata(
      Number(id),
      body.name,
      body.description,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignService.deleteCampaign(id);
  }
}
