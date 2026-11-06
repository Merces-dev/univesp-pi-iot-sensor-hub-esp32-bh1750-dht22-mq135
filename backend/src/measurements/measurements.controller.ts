import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { MeasurementsService } from "./measurements.service";

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new BadRequestException(`Data inválida: ${value}`);
  return d;
}

@Controller("measurements")
export class MeasurementsController {
  constructor(private readonly service: MeasurementsService) {}

  @Get()
  list(@Query("from") from?: string, @Query("to") to?: string, @Query("limit") limit?: string) {
    return this.service.findByPeriod(parseDate(from), parseDate(to), limit ? parseInt(limit, 10) || 100 : 100);
  }

  @Get("summary")
  summary(@Query("from") from?: string, @Query("to") to?: string) {
    return this.service.summary(parseDate(from), parseDate(to));
  }
}

@Controller("health")
export class HealthController {
  constructor(private readonly service: MeasurementsService) {}

  @Get()
  async health() {
    const db = await this.service.databaseIsUp();
    return { status: db ? "ok" : "degraded", database: db ? "up" : "down" };
  }
}
