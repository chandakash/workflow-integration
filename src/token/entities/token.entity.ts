import { Credentials } from 'google-auth-library';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column({nullable: true})
  authCode: string;

  @Column("json", {nullable: true})
  tokens: Credentials;
}
