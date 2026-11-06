import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Measurement } from "./measurement.entity";
import { HealthController, MeasurementsController } from "./measurements.controller";
import { MeasurementsService } from "./measurements.service";

@Module({
  imports: [TypeOrmModule.forFeature([Measurement])],
  providers: [MeasurementsService],
  controllers: [MeasurementsController, HealthController],
})
export class MeasurementsModule {}
