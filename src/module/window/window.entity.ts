import { Column, Entity } from 'typeorm';

import { BaseEntity } from 'src/common';

@Entity({ name: 'windows' })
export class WindowEntity extends BaseEntity {
  @Column({ type: 'boolean', default: false, nullable: false })
  public isBooked: boolean;

  @Column({ type: 'timestamptz', precision: 3, nullable: false })
  public date: Date;
}
