import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base-entity';
import { UserContextRecord } from './user-context-record';

@Entity('override_events')
export class OverrideEvent extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  ucrId: string;

  @ManyToOne(() => UserContextRecord, (ucr) => ucr.overrideEvents)
  @JoinColumn({ name: 'ucr_id' })
  ucr: UserContextRecord;

  @Column({ type: 'int' })
  fromVersion: number;

  @Column({ type: 'int' })
  toVersion: number;

  @Column({ type: 'jsonb' })
  changes: any; // Diff or patch

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  @Index()
  createdBy: string; // User ID
}
