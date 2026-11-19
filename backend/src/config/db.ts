import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../db/schema";
import dotenv from "dotenv";

dotenv.config();

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT || 3306);
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD || "1234";
const dbName = process.env.DB_NAME || "portal_rrhh";

export const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
});

/**
 * Instancia central de Drizzle ORM para todas las consultas y modelos.
 */
export const db = drizzle(pool, { schema, mode: "default" });

/**
 * Inicializador de esquema en Drizzle ORM:
 * Crea automáticamente las tablas de la base de datos si no existen,
 * guiándose exclusivamente por la definición de TypeScript de Drizzle,
 * sin necesidad de ningún archivo .sql externo.
 */
export async function ensureDrizzleSchema() {
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.query(`USE \`${dbName}\`;`);

    // Crear tablas con Drizzle ORM definitions si no existen
    await connection.query(`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        departamento VARCHAR(100) NOT NULL,
        puesto VARCHAR(120) NOT NULL,
        fecha_ingreso DATE NOT NULL,
        jefe_id INT NULL,
        rol ENUM('colaborador', 'rrhh') NOT NULL DEFAULT 'colaborador',
        estado ENUM('activo', 'inactivo', 'vacaciones', 'incapacitado') NOT NULL DEFAULT 'activo',
        CONSTRAINT fk_colab_jefe FOREIGN KEY (jefe_id) REFERENCES colaboradores(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS saldos_vacaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        periodo VARCHAR(20) NOT NULL,
        dias_asignados DECIMAL(5,2) NOT NULL DEFAULT 12.00,
        dias_tomados DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        dias_disponibles DECIMAL(5,2) NOT NULL DEFAULT 12.00,
        CONSTRAINT fk_saldos_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        tipo VARCHAR(60) NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        estado ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
        aprobador_id INT NULL,
        creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sol_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE,
        CONSTRAINT fk_sol_aprob FOREIGN KEY (aprobador_id) REFERENCES colaboradores(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS incapacidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        fecha_inicio DATE NOT NULL,
        dias INT NOT NULL,
        entidad ENUM('CCSS', 'INS') NOT NULL,
        CONSTRAINT fk_incap_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS movimientos_personal (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        tipo ENUM('ingreso', 'salida', 'ascenso') NOT NULL,
        fecha DATE NOT NULL,
        motivo TEXT NOT NULL,
        CONSTRAINT fk_mov_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS consultas_chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        colaborador_id INT NOT NULL,
        pregunta TEXT NOT NULL,
        intencion VARCHAR(40) NOT NULL,
        agente VARCHAR(80) NOT NULL,
        documentos_citados JSON NOT NULL,
        resuelta BOOLEAN NOT NULL DEFAULT TRUE,
        escalada BOOLEAN NOT NULL DEFAULT FALSE,
        latencia_ms INT NOT NULL,
        fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_chat_colab FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS reportes_diarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fecha DATE UNIQUE NOT NULL,
        datos_json JSON NOT NULL,
        resumen_texto TEXT NOT NULL,
        generado_por VARCHAR(80) NOT NULL DEFAULT 'analystAgent (cron 07:00)'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS documentos_vectores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drive_file_id VARCHAR(128) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        seccion VARCHAR(255) NOT NULL,
        version VARCHAR(32) NOT NULL,
        fecha_vigencia DATE NOT NULL,
        enlace_drive TEXT NOT NULL,
        contenido LONGTEXT NOT NULL,
        embedding JSON NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } finally {
    await connection.end();
  }
}

/**
 * Calcula la similitud coseno exacta entre dos vectores de 768 dimensiones.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export * from "../db/schema";
