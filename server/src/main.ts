import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 跨域支持，支持 admin (5174) 与 client (5173) 访问
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 全局 API 前缀 /api/v1
  app.setGlobalPrefix('api/v1');

  // 全局 DTO 校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 配置 Swagger 在线调试文档
  const config = new DocumentBuilder()
    .setTitle('SZTUFA 足球赛况轻量服务')
    .setDescription('深圳技术大学足球赛况系统 - 现场记录、时间线与实时技术统计 API')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`[SZTUFA Match Server] running on http://localhost:${port}/api/v1`);
  console.log(`[SZTUFA Match Server] Swagger docs on http://localhost:${port}/api/docs`);
}

bootstrap();
