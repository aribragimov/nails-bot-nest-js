import { QueryRunner } from 'typeorm';

export type DomainServiceOptions = {
  queryRunner?: QueryRunner;
};
