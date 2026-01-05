import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base-entity';
import { ModuleRun } from './module-run';

export type KeywordStatus = 'IN_SCOPE' | 'BORDERLINE' | 'BLOCKED';

@Entity('keyword_gap_items')
export class KeywordGapItem extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  runId: string;

  @ManyToOne(() => ModuleRun, (run) => run.keywordGapItems)
  @JoinColumn({ name: 'run_id' })
  run: ModuleRun;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  keyword: string;

  @Column({
    type: 'enum',
    enum: ['IN_SCOPE', 'BORDERLINE', 'BLOCKED'],
    default: 'IN_SCOPE',
  })
  status: KeywordStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  theme: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  competitorRanks: Record<string, number> | null;

  @Column({ type: 'int', nullable: true })
  competitorCount: number | null;

  @Column({ type: 'int', nullable: true })
  volume: number | null;

  @Column({ type: 'float', nullable: true })
  kd: number | null; // Keyword Difficulty

  @Column({ type: 'float', nullable: true })
  cpc: number | null; // Cost Per Click

  @Column({ type: 'float', nullable: true })
  estimatedValue: number | null;

  @Column({ type: 'float', nullable: true })
  contentPriorityScore: number | null;

  @Column({ type: 'float', nullable: true })
  confidenceScore: number | null;

  @Column({ type: 'text', nullable: true })
  recommendedAction: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
