import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { SessionRepository } from "./session.repository";
import { SESSION_VALIDATOR } from "../common/auth/session-context.middleware";
import { UsersController } from "../users/users.controller";
import { UsersService } from "../users/users.service";
import { UsersRepository } from "../users/users.repository";

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    PasswordService,
    SessionRepository,
    UsersService,
    UsersRepository,
    { provide: SESSION_VALIDATOR, useExisting: AuthService },
  ],
  exports: [AuthService, SessionRepository, PasswordService, UsersService, SESSION_VALIDATOR],
})
export class AuthModule {}
