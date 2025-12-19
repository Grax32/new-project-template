import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.API_PORT || 6314;
  await app.listen(port);
  console.log(`🚀 API is running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
