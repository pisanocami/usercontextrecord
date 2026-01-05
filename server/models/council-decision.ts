import 'reflect-metadata';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base-entity';
import { ModuleRun } from './module-run';

export type DecisionType = 'ADOPT' | 'REJECT' | 'REQUEST_OVERRIDE';

@Entity('council_decisions')
export class CouncilDecision extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  runId!: string;

  @ManyToOne(() => ModuleRun, (run) => run.decision)
  @JoinColumn({ name: 'run_id' })
  run!: ModuleRun;

  @Column({
    type: 'enum',
    enum: ['ADOPT', 'REJECT', 'REQUEST_OVERRIDE'],
  })
  decision!: DecisionType;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'uuid' })
  @Index()
  decidedBy!: string; // User ID

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;
}
