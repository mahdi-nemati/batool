import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./common/app-setup";
import { ConfigService } from "./common/config/config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  configureApp(app, config);
  await app.listen(config.app.apiPort);
  console.log(`Batool API listening on http://localhost:${config.app.apiPort}/api`);
}

void bootstrap();
