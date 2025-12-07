import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('healthcheck')
  healthcheck(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ status: 'OK' }, null, 2));
  }
}
