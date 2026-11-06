import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { And, FindOptionsWhere, LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { ProcessedTelemetry } from "../sensors/interfaces/telemetry.interface";
import { Measurement } from "./measurement.entity";

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);

  constructor(
    @InjectRepository(Measurement)
    private readonly repo: Repository<Measurement>,
  ) {}

  @OnEvent("telemetry.processed")
  async persist(p: ProcessedTelemetry): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          temperature: p.temperature,
          humidity: p.humidity,
          luminosity: p.lux,
          heatIndex: p.heatIndex,
          airQuality: p.airQuality,
          deviceId: process.env.DEVICE_ID ?? "esp32-s3",
        }),
      );
    } catch (err) {
      // Falha de banco não pode derrubar o fluxo em tempo real.
      this.logger.error(`Falha ao gravar leitura: ${(err as Error).message}`);
    }
  }

  private where(from?: Date, to?: Date): FindOptionsWhere<Measurement> {
    // Intervalo semiaberto [from, to): mesmo critério usado no resumo.
    if (from && to) return { createdAt: And(MoreThanOrEqual(from), LessThan(to)) };
    if (from) return { createdAt: MoreThanOrEqual(from) };
    if (to) return { createdAt: LessThan(to) };
    return {};
  }

  findByPeriod(from?: Date, to?: Date, limit = 100) {
    return this.repo.find({
      where: this.where(from, to),
      order: { createdAt: "DESC" },
      take: Math.min(Math.max(limit, 1), 1000),
    });
  }

  async summary(from?: Date, to?: Date) {
    const qb = this.repo
      .createQueryBuilder("m")
      .select("COUNT(*)", "quantidade")
      .addSelect("ROUND(AVG(m.temperature)::numeric, 2)", "temperaturaMedia")
      .addSelect("MIN(m.temperature)", "temperaturaMinima")
      .addSelect("MAX(m.temperature)", "temperaturaMaxima")
      .addSelect("ROUND(AVG(m.humidity)::numeric, 2)", "umidadeMedia")
      .addSelect("ROUND(AVG(m.luminosity)::numeric, 2)", "luminosidadeMedia")
      .addSelect("ROUND(AVG(m.air_quality)::numeric, 2)", "qualidadeArMedia");
    if (from) qb.andWhere("m.created_at >= :from", { from });
    if (to) qb.andWhere("m.created_at < :to", { to });
    const r = await qb.getRawOne();
    const n = (v: string | null) => (v === null || v === undefined ? null : parseFloat(v));
    return {
      quantidade: parseInt(r.quantidade, 10),
      temperaturaMedia: n(r.temperaturaMedia),
      temperaturaMinima: n(r.temperaturaMinima),
      temperaturaMaxima: n(r.temperaturaMaxima),
      umidadeMedia: n(r.umidadeMedia),
      luminosidadeMedia: n(r.luminosidadeMedia),
      qualidadeArMedia: n(r.qualidadeArMedia),
    };
  }

  async databaseIsUp(): Promise<boolean> {
    try {
      await this.repo.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
