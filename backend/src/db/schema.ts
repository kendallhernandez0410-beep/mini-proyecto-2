import {
  mysqlTable,
  int,
  varchar,
  text,
  date,
  datetime,
  boolean,
  decimal,
  json,
  mysqlEnum,
  AnyMySqlColumn,
} from "drizzle-orm/mysql-core";

// 1. colaboradores
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  departamento: varchar("departamento", { length: 100 }).notNull(),
  puesto: varchar("puesto", { length: 120 }).notNull(),
  fechaIngreso: date("fecha_ingreso", { mode: "string" }).notNull(),
  jefeId: int("jefe_id").references((): AnyMySqlColumn => colaboradores.id, {
    onDelete: "set null",
  }),
  rol: mysqlEnum("rol", ["colaborador", "rrhh"]).notNull().default("colaborador"),
  estado: mysqlEnum("estado", ["activo", "inactivo", "vacaciones", "incapacitado"])
    .notNull()
    .default("activo"),
});

// 2. saldos_vacaciones
export const saldosVacaciones = mysqlTable("saldos_vacaciones", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  periodo: varchar("periodo", { length: 20 }).notNull(),
  diasAsignados: decimal("dias_asignados", { precision: 5, scale: 2 })
    .notNull()
    .default("12.00"),
  diasTomados: decimal("dias_tomados", { precision: 5, scale: 2 })
    .notNull()
    .default("0.00"),
  diasDisponibles: decimal("dias_disponibles", { precision: 5, scale: 2 })
    .notNull()
    .default("12.00"),
});

// 3. solicitudes
export const solicitudes = mysqlTable("solicitudes", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 60 }).notNull(),
  fechaInicio: date("fecha_inicio", { mode: "string" }).notNull(),
  fechaFin: date("fecha_fin", { mode: "string" }).notNull(),
  estado: mysqlEnum("estado", ["pendiente", "aprobada", "rechazada"])
    .notNull()
    .default("pendiente"),
  aprobadorId: int("aprobador_id").references(() => colaboradores.id, {
    onDelete: "set null",
  }),
  creadaEn: datetime("creada_en", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 4. incapacidades
export const incapacidades = mysqlTable("incapacidades", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 100 }).notNull(),
  fechaInicio: date("fecha_inicio", { mode: "string" }).notNull(),
  dias: int("dias").notNull(),
  entidad: mysqlEnum("entidad", ["CCSS", "INS"]).notNull(),
});

// 5. movimientos_personal
export const movimientosPersonal = mysqlTable("movimientos_personal", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  tipo: mysqlEnum("tipo", ["ingreso", "salida", "ascenso"]).notNull(),
  fecha: date("fecha", { mode: "string" }).notNull(),
  motivo: text("motivo").notNull(),
});

// 6. consultas_chat
export interface DocumentoCitado {
  titulo: string;
  seccion: string;
  version: string;
  enlace_drive: string;
  similitud?: number;
}

export const consultasChat = mysqlTable("consultas_chat", {
  id: int("id").autoincrement().primaryKey(),
  colaboradorId: int("colaborador_id")
    .notNull()
    .references(() => colaboradores.id, { onDelete: "cascade" }),
  pregunta: text("pregunta").notNull(),
  intencion: varchar("intencion", { length: 40 }).notNull(),
  agente: varchar("agente", { length: 80 }).notNull(),
  documentosCitados: json("documentos_citados")
    .$type<DocumentoCitado[]>()
    .notNull(),
  resuelta: boolean("resuelta").notNull().default(true),
  escalada: boolean("escalada").notNull().default(false),
  latenciaMs: int("latencia_ms").notNull(),
  fecha: datetime("fecha", { mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 7. reportes_diarios
export const reportesDiarios = mysqlTable("reportes_diarios", {
  id: int("id").autoincrement().primaryKey(),
  fecha: date("fecha", { mode: "string" }).notNull().unique(),
  datosJson: json("datos_json").notNull(),
  resumenTexto: text("resumen_texto").notNull(),
  generadoPor: varchar("generado_por", { length: 80 }).notNull(),
});

// 8. documentos_vectores
export const documentosVectores = mysqlTable("documentos_vectores", {
  id: int("id").autoincrement().primaryKey(),
  driveFileId: varchar("drive_file_id", { length: 128 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  seccion: varchar("seccion", { length: 255 }).notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  fechaVigencia: date("fecha_vigencia", { mode: "string" }).notNull(),
  enlaceDrive: text("enlace_drive").notNull(),
  contenido: text("contenido").notNull(),
  embedding: json("embedding").$type<number[]>().notNull(),
});
