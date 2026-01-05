import 'reflect-metadata';
import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base-entity';
import { ModuleRun } from './module-run';
import { OverrideEvent } from './override-event';

export type UCRStatus = 'DRAFT_AI' | 'AI_READY' | 'HUMAN_CONFIRMED' | 'LOCKED' | 'EXPIRED';
export type UCRConfidence = 'low' | 'medium' | 'high';

@Entity('user_context_records')
export class UserContextRecord extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  brandId!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 64 })
  hash!: string;

  @Column({
    type: 'enum',
    enum: ['DRAFT_AI', 'AI_READY', 'HUMAN_CONFIRMED', 'LOCKED', 'EXPIRED'],
    default: 'DRAFT_AI',
  })
  status!: UCRStatus;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  confidence!: UCRConfidence;

  @Column({ name: 'cmo_safe', type: 'boolean', default: false })
  cmoSafe!: boolean;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil!: Date | null;

  @Column({ type: 'jsonb' })
  data!: any; // Full UCR schema

  // Relations
  @OneToMany(() => ModuleRun, (run) => run.ucr)
  runs!: ModuleRun[];

  @OneToMany(() => OverrideEvent, (event) => event.ucr)
  overrideEvents!: OverrideEvent[];
}
