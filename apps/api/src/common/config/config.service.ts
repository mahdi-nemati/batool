import { Injectable } from "@nestjs/common";
import { parseAppEnv, type AppEnv } from "./env.schema";

@Injectable()
export class ConfigService {
  readonly app: AppEnv;

  constructor() {
    this.app = parseAppEnv();
  }
}
