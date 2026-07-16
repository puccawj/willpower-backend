import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const extraOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) ||
    extraOrigins.includes(origin)
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a reverse proxy (nginx/Caddy terminating TLS), trust its X-Forwarded-* headers
  // so req.protocol reports "https" instead of the plain-HTTP hop to this process.
  app.set('trust proxy', 1);
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const config = new DocumentBuilder()
    .setTitle('Willpower Institute API')
    .setDescription('Backend API for the Willpower Institute admin panel and public site.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
