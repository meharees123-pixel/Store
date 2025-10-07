import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const httpsOptions = {
    key: readFileSync(join(__dirname, '..', 'ssl', 'server.key')),
    cert: readFileSync(join(__dirname, '..', 'ssl', 'server.cert')),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  const config = new DocumentBuilder()
    .setTitle('Store API')
    .setDescription('Store API description')
    .setVersion('v1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addTag('users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.security = [{ 'access-token': [] }];

  SwaggerModule.setup('api-docs', app, document);

  await app.listen(443);
}
bootstrap();