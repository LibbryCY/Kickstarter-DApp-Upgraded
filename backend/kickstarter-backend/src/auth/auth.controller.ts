import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('nonce')
  async getNonce(@Query('address') address: string) {
    const nonce = await this.authService.getNonce(address);
    return { nonce };
  }

  @Post('verify')
  async verify(@Body() body: { address: string; signature: string }) {
    return this.authService.verifySignature(body.address, body.signature);
  }

  @Get('users')
  async getUsers() {
    return this.authService.getAllUsers();
  }
  
}
