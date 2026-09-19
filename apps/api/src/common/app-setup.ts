import { INestApplication, ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import { ConfigService } from "./config/config.service";
import { HttpExceptionFilter } from "./errors/http-exception.filter";

export function configureApp(app: INestApplication, config: ConfigService): void {
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  app.enableCors({ origin: config.app.webOrigin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
