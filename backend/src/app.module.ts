import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MqttModule } from "./mqtt/mqtt.module";
import { SensorsModule } from "./sensors/sensors.module";
import { AlertsModule } from "./alerts/alerts.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Measurement } from "./measurements/measurement.entity";
import { MeasurementsModule } from "./measurements/measurements.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432", 10),
      username: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "postgres",
      database: process.env.DB_NAME ?? "sensorhub",
      entities: [Measurement],
      synchronize: true, // uso acadêmico: cria a tabela automaticamente
      retryAttempts: 10,
      retryDelay: 3000,
    }),
    MqttModule,
    SensorsModule,
    AlertsModule,
    MeasurementsModule,
  ],
})
export class AppModule {}
