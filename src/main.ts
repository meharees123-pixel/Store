import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      'access-token', // This name must match @ApiBearerAuth('access-token')
    )
    .addTag('users')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Apply global security scheme
  document.security = [{ 'access-token': [] }];

  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();