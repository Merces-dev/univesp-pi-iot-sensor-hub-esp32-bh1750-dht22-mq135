import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// O driver pg devolve NUMERIC como texto; converte para número na leitura.
const numeric = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? null : parseFloat(v)),
};

@Entity({ name: "measurements" })
export class Measurement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "numeric", nullable: true, transformer: numeric })
  temperature: number | null;

  @Column({ type: "numeric", nullable: true, transformer: numeric })
  humidity: number | null;

  @Column({ type: "numeric", nullable: true, transformer: numeric })
  luminosity: number | null;

  @Column({ name: "heat_index", type: "numeric", nullable: true, transformer: numeric })
  heatIndex: number | null;

  @Column({ name: "air_quality", type: "numeric", nullable: true, transformer: numeric })
  airQuality: number | null;

  @Column({ name: "device_id", type: "varchar", length: 80 })
  deviceId: string;

  @Index()
  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;
}
