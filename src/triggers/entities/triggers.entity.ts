import { Credentials } from 'google-auth-library';
import { AppConfig } from 'src/common/interfaces';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Triggers {
  @PrimaryGeneratedColumn()
  triggerId: number;

  @Column()
  userId: string;

  @Column({nullable: true})
  App: string; // googlesheet

  @Column("json", {nullable: true})
  eventSource: string; // for gsheet. 1. New Row Added, 2. New Updates, 3. New Sheet in document.

  @Column({nullable: true})
  actionId: string; // FK to Actions.

  @Column("json", {nullable: true})
  appConfig: AppConfig;
}
