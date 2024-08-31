import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SvcConfigService {
  constructor(private readonly configService: ConfigService) {}

  public get<T>(name: string): T;
  public get<T>(name: string, { raiseError }: { raiseError?: boolean }): T | undefined;
  public get<T>(name: string, { raiseError = true }: { raiseError?: boolean } = {}): T | undefined {
    const value = this.configService.get<T>(name);

    if (!value && raiseError) {
      throw new InternalServerErrorException(`${name} parameter does not specified in .env file`);
    }

    return value;
  }
}
