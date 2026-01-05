import 'reflect-metadata';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany, OneToOne, Index } from 'typeorm';
import { BaseEntity } from './base-entity';
import { UserContextRecord } from './user-context-record';
import { CouncilDecision } from './council-decision';
import { KeywordGapItem } from './keyword-gap-item';

export type ModuleRunStatus = 'queued' | 'running' | 'success' | 'failed';
export type AnalysisState = 'AI_GENERATED' | 'HUMAN_CONFIRMED' | 'PROVISIONAL';

@Entity('module_runs')
export class ModuleRun extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  module!: string; // e.g., 'keyword_gap_lite'

  @Column({ type: 'uuid' })
  @Index()
  ucrId!: string;

  @ManyToOne(() => UserContextRecord, (ucr) => ucr.runs)
  @JoinColumn({ name: 'ucr_id' })
  ucr!: UserContextRecord;

  @Column({
    type: 'enum',
    enum: ['AI_GENERATED', 'HUMAN_CONFIRMED', 'PROVISIONAL'],
    default: 'AI_GENERATED',
  })
  analysisState!: AnalysisState;

  @Column({ type: 'jsonb' })
  inputs!: Record<string, any>;

  @Column({ type: 'jsonb' })
  gates!: {
    passed: boolean;
    violations: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  violations!: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  proposals!: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  summary!: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: ['queued', 'running', 'success', 'failed'],
    default: 'queued',
  })
  status!: ModuleRunStatus;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  costUsd!: number;

  @Column({ type: 'int', default: 0 })
  runtimeMs!: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  // Relations
  @OneToOne(() => CouncilDecision, (decision) => decision.run)
  decision!: CouncilDecision;

  @OneToMany(() => KeywordGapItem, (item) => item.run)
  keywordGapItems!: KeywordGapItem[];
}
