import bcrypt from "bcryptjs";
import {
  db,
  pool,
  ensureDrizzleSchema,
  colaboradores,
  saldosVacaciones,
  solicitudes,
  incapacidades,
  movimientosPersonal,
  consultasChat,
  reportesDiarios,
  documentosVectores,
} from "../config/db";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const NOMBRES_CR = [
  { id: 1, nombre: "Valeria Solís Elizondo", email: "valeria.solis@puravida.cr", depto: "Recursos Humanos", puesto: "Directora de Capital Humano", rol: "rrhh" as const, ingreso: "2019-02-15", jefeId: null, estado: "activo" as const },
  { id: 2, nombre: "Mauricio Brenes Araya", email: "mauricio.brenes@puravida.cr", depto: "Recursos Humanos", puesto: "Especialista de Nómina y Legislación Laboral", rol: "rrhh" as const, ingreso: "2020-06-01", jefeId: 1, estado: "activo" as const },
  { id: 3, nombre: "Carolina Mora Chinchilla", email: "carolina.mora@puravida.cr", depto: "Recursos Humanos", puesto: "Analista de Cultura y Bienestar", rol: "rrhh" as const, ingreso: "2022-03-10", jefeId: 1, estado: "activo" as const },
  { id: 4, nombre: "Alejandro Jiménez Quirós", email: "alejandro.jimenez@puravida.cr", depto: "Ingeniería de Software", puesto: "VP de Ingeniería", rol: "colaborador" as const, ingreso: "2018-09-01", jefeId: null, estado: "activo" as const },
  { id: 5, nombre: "Esteban Vargas Cascante", email: "esteban.vargas@puravida.cr", depto: "Ingeniería de Software", puesto: "Senior Full-Stack Engineer", rol: "colaborador" as const, ingreso: "2021-04-12", jefeId: 4, estado: "activo" as const },
  { id: 6, nombre: "Daniela Rojas Vindas", email: "daniela.rojas@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "Lead AI Engineer", rol: "colaborador" as const, ingreso: "2020-01-20", jefeId: 4, estado: "activo" as const },
  { id: 7, nombre: "Fabián Cordero Umaña", email: "fabian.cordero@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "Cloud Security Manager", rol: "colaborador" as const, ingreso: "2019-11-04", jefeId: 4, estado: "activo" as const },
  { id: 8, nombre: "Mariana Esquivel Castro", email: "mariana.esquivel@puravida.cr", depto: "Producto y UX", puesto: "Head of Product", rol: "colaborador" as const, ingreso: "2020-08-17", jefeId: null, estado: "activo" as const },
  { id: 9, nombre: "Roberto Alvarado Monge", email: "roberto.alvarado@puravida.cr", depto: "Finanzas y Legal", puesto: "Gerente Financiero", rol: "colaborador" as const, ingreso: "2019-05-06", jefeId: null, estado: "activo" as const },
  { id: 10, nombre: "Gabriela Chacón Madrigal", email: "gabriela.chacon@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Gerente de Customer Success", rol: "colaborador" as const, ingreso: "2020-10-12", jefeId: null, estado: "activo" as const },
  { id: 11, nombre: "Sebastián Murillo Salas", email: "sebastian.murillo@puravida.cr", depto: "Ingeniería de Software", puesto: "Backend Developer II", rol: "colaborador" as const, ingreso: "2022-01-17", jefeId: 4, estado: "vacaciones" as const },
  { id: 12, nombre: "Adriana Villalobos Fonseca", email: "adriana.villalobos@puravida.cr", depto: "Ingeniería de Software", puesto: "Frontend Developer III", rol: "colaborador" as const, ingreso: "2021-07-05", jefeId: 4, estado: "activo" as const },
  { id: 13, nombre: "Diego Calderón Zúñiga", email: "diego.calderon@puravida.cr", depto: "Ingeniería de Software", puesto: "Staff Software Architect", rol: "colaborador" as const, ingreso: "2019-03-11", jefeId: 4, estado: "activo" as const },
  { id: 14, nombre: "Paola Hidalgo Fallas", email: "paola.hidalgo@puravida.cr", depto: "Ingeniería de Software", puesto: "QA Automation Lead", rol: "colaborador" as const, ingreso: "2020-09-14", jefeId: 4, estado: "activo" as const },
  { id: 15, nombre: "Andrés Ramírez Bermúdez", email: "andres.ramirez@puravida.cr", depto: "Ingeniería de Software", puesto: "Mobile Engineer (iOS/Android)", rol: "colaborador" as const, ingreso: "2023-02-06", jefeId: 4, estado: "incapacitado" as const },
  { id: 16, nombre: "Camila Picado Bolaños", email: "camila.picado@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "Machine Learning Engineer", rol: "colaborador" as const, ingreso: "2022-05-23", jefeId: 6, estado: "activo" as const },
  { id: 17, nombre: "Josué Méndez Valverde", email: "josue.mendez@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "Data Engineer II", rol: "colaborador" as const, ingreso: "2021-11-08", jefeId: 6, estado: "vacaciones" as const },
  { id: 18, nombre: "Natalia Guzmán Solano", email: "natalia.guzman@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "NLP Specialist", rol: "colaborador" as const, ingreso: "2023-06-19", jefeId: 6, estado: "activo" as const },
  { id: 19, nombre: "Luis Fernando Soto Badilla", email: "luis.soto@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "Analytics Engineer", rol: "colaborador" as const, ingreso: "2022-08-01", jefeId: 6, estado: "activo" as const },
  { id: 20, nombre: "Sofía Benavides Carvajal", email: "sofia.benavides@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "AI Ethics & Governance Analyst", rol: "colaborador" as const, ingreso: "2024-01-15", jefeId: 6, estado: "activo" as const },
  { id: 21, nombre: "Kenneth Corrales Obando", email: "kenneth.corrales@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "DevSecOps Engineer", rol: "colaborador" as const, ingreso: "2021-03-22", jefeId: 7, estado: "activo" as const },
  { id: 22, nombre: "Lucía Herrera Alfaro", email: "lucia.herrera@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "Site Reliability Engineer (SRE)", rol: "colaborador" as const, ingreso: "2020-12-01", jefeId: 7, estado: "activo" as const },
  { id: 23, nombre: "Marco Vinicio Porras", email: "marco.porras@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "SOC Analyst II", rol: "colaborador" as const, ingreso: "2023-04-10", jefeId: 7, estado: "incapacitado" as const },
  { id: 24, nombre: "Elena Barrantes Ulate", email: "elena.barrantes@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "Cloud Infrastructure Engineer", rol: "colaborador" as const, ingreso: "2022-09-05", jefeId: 7, estado: "activo" as const },
  { id: 25, nombre: "Carlos Alberto Vega", email: "carlos.vega@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "Penetration Tester", rol: "colaborador" as const, ingreso: "2021-06-14", jefeId: 7, estado: "activo" as const },
  { id: 26, nombre: "Mónica Aguilar Sancho", email: "monica.aguilar@puravida.cr", depto: "Producto y UX", puesto: "Senior Product Manager", rol: "colaborador" as const, ingreso: "2020-04-06", jefeId: 8, estado: "activo" as const },
  { id: 27, nombre: "Rodrigo Pacheco León", email: "rodrigo.pacheco@puravida.cr", depto: "Producto y UX", puesto: "Lead Product Designer", rol: "colaborador" as const, ingreso: "2021-01-18", jefeId: 8, estado: "vacaciones" as const },
  { id: 28, nombre: "Fernanda Oviedo Segura", email: "fernanda.oviedo@puravida.cr", depto: "Producto y UX", puesto: "UX Researcher", rol: "colaborador" as const, ingreso: "2022-11-14", jefeId: 8, estado: "activo" as const },
  { id: 29, nombre: "Javier Elizondo Matarrita", email: "javier.elizondo@puravida.cr", depto: "Producto y UX", puesto: "Product Owner", rol: "colaborador" as const, ingreso: "2023-03-27", jefeId: 8, estado: "activo" as const },
  { id: 30, nombre: "Priscila Arias Conejo", email: "priscila.arias@puravida.cr", depto: "Producto y UX", puesto: "UI Design System Specialist", rol: "colaborador" as const, ingreso: "2024-02-12", jefeId: 8, estado: "activo" as const },
  { id: 31, nombre: "Gustavo Navarro Quesada", email: "gustavo.navarro@puravida.cr", depto: "Finanzas y Legal", puesto: "Contador General CPI", rol: "colaborador" as const, ingreso: "2019-08-19", jefeId: 9, estado: "activo" as const },
  { id: 32, nombre: "Xinia Morales Paniagua", email: "xinia.morales@puravida.cr", depto: "Finanzas y Legal", puesto: "Asesora Legal Corporativa", rol: "colaborador" as const, ingreso: "2020-02-24", jefeId: 9, estado: "activo" as const },
  { id: 33, nombre: "Oscar Chaves Granados", email: "oscar.chaves@puravida.cr", depto: "Finanzas y Legal", puesto: "Analista de Presupuesto y Tesorería", rol: "colaborador" as const, ingreso: "2022-07-11", jefeId: 9, estado: "activo" as const },
  { id: 34, nombre: "Rebeca Solórzano Marin", email: "rebeca.solorzano@puravida.cr", depto: "Finanzas y Legal", puesto: "Especialista en Compras TI", rol: "colaborador" as const, ingreso: "2023-08-07", jefeId: 9, estado: "activo" as const },
  { id: 35, nombre: "Sergio Bolaños Azofeifa", email: "sergio.bolanos@puravida.cr", depto: "Finanzas y Legal", puesto: "Analista de Cumplimiento Tributario", rol: "colaborador" as const, ingreso: "2021-10-04", jefeId: 9, estado: "activo" as const },
  { id: 36, nombre: "Tatiana Portuguez Siles", email: "tatiana.portuguez@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Technical Account Manager", rol: "colaborador" as const, ingreso: "2021-05-10", jefeId: 10, estado: "activo" as const },
  { id: 37, nombre: "Esteban Núñez Bogantes", email: "esteban.nunez@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Implementation Specialist", rol: "colaborador" as const, ingreso: "2022-02-28", jefeId: 10, estado: "incapacitado" as const },
  { id: 38, nombre: "Verónica Castro Sibaja", email: "veronica.castro@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Customer Onboarding Lead", rol: "colaborador" as const, ingreso: "2020-07-20", jefeId: 10, estado: "activo" as const },
  { id: 39, nombre: "Bryan Salazar Cambronero", email: "bryan.salazar@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Tier 3 Support Engineer", rol: "colaborador" as const, ingreso: "2023-01-09", jefeId: 10, estado: "activo" as const },
  { id: 40, nombre: "Melania Castrillo Mena", email: "melania.castrillo@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Service Delivery Coordinator", rol: "colaborador" as const, ingreso: "2023-10-16", jefeId: 10, estado: "activo" as const },
  { id: 41, nombre: "Kevin Abarca Venegas", email: "kevin.abarca@puravida.cr", depto: "Ingeniería de Software", puesto: "Full-Stack Developer II", rol: "colaborador" as const, ingreso: "2022-04-18", jefeId: 4, estado: "vacaciones" as const },
  { id: 42, nombre: "Laura Montero Gamboa", email: "laura.montero@puravida.cr", depto: "Ingeniería de Software", puesto: "QA Engineer II", rol: "colaborador" as const, ingreso: "2021-09-27", jefeId: 14, estado: "activo" as const },
  { id: 43, nombre: "Daniel Sequeira Artavia", email: "daniel.sequeira@puravida.cr", depto: "Ingeniería de Software", puesto: "Backend Engineer I", rol: "colaborador" as const, ingreso: "2024-03-04", jefeId: 4, estado: "activo" as const },
  { id: 44, nombre: "Irene Camacho Espinoza", email: "irene.camacho@puravida.cr", depto: "Ingeniería de Software", puesto: "Frontend Engineer II", rol: "colaborador" as const, ingreso: "2022-12-05", jefeId: 4, estado: "activo" as const },
  { id: 45, nombre: "Pablo Ureña Chavarría", email: "pablo.urena@puravida.cr", depto: "Ingeniería de Software", puesto: "Platform Engineer", rol: "colaborador" as const, ingreso: "2020-03-16", jefeId: 4, estado: "activo" as const },
  { id: 46, nombre: "Alonso Zumbado Retana", email: "alonso.zumbado@puravida.cr", depto: "Ingeniería de Software", puesto: "Database Reliability Engineer", rol: "colaborador" as const, ingreso: "2019-10-07", jefeId: 4, estado: "activo" as const },
  { id: 47, nombre: "Karla Víquez Angulo", email: "karla.viquez@puravida.cr", depto: "Recursos Humanos", puesto: "Reclutadora IT Senior", rol: "rrhh" as const, ingreso: "2021-08-23", jefeId: 1, estado: "activo" as const },
  { id: 48, nombre: "Cristian Garita Meza", email: "cristian.garita@puravida.cr", depto: "Ciberseguridad y Cloud", puesto: "Network Security Engineer", rol: "colaborador" as const, ingreso: "2022-06-13", jefeId: 7, estado: "activo" as const },
  { id: 49, nombre: "Silvia Orozco Piedra", email: "silvia.orozco@puravida.cr", depto: "Producto y UX", puesto: "Technical Writer & Docs Lead", rol: "colaborador" as const, ingreso: "2021-02-15", jefeId: 8, estado: "activo" as const },
  { id: 50, nombre: "Jorge Luis Leiva Solano", email: "jorge.leiva@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "MLOps Engineer", rol: "colaborador" as const, ingreso: "2023-05-08", jefeId: 6, estado: "activo" as const },
  { id: 51, nombre: "Fiorella Córdoba Peraza", email: "fiorella.cordoba@puravida.cr", depto: "Ingeniería de Software", puesto: "Full-Stack Developer I", rol: "colaborador" as const, ingreso: formatDate(daysAgo(22)), jefeId: 4, estado: "activo" as const },
  { id: 52, nombre: "Mateo Sandí Barquero", email: "mateo.sandi@puravida.cr", depto: "IA y Ciencia de Datos", puesto: "AI Prompt & RAG Engineer", rol: "colaborador" as const, ingreso: formatDate(daysAgo(14)), jefeId: 6, estado: "activo" as const },
  { id: 53, nombre: "Gloriana Trejos Loría", email: "gloriana.trejos@puravida.cr", depto: "Operaciones y Customer Success", puesto: "Customer Success Specialist", rol: "colaborador" as const, ingreso: formatDate(daysAgo(8)), jefeId: 10, estado: "activo" as const },
  { id: 54, nombre: "Héctor Marín Coto", email: "hector.marin@puravida.cr", depto: "Ingeniería de Software", puesto: "Backend Developer II", rol: "colaborador" as const, ingreso: "2022-01-10", jefeId: 4, estado: "inactivo" as const },
  { id: 55, nombre: "Pamela Cerdas Leitón", email: "pamela.cerdas@puravida.cr", depto: "Producto y UX", puesto: "Product Designer II", rol: "colaborador" as const, ingreso: "2021-11-15", jefeId: 8, estado: "inactivo" as const },
];

export async function seedBackendDatabase() {
  console.log("🌱 Ejecutando seed con Drizzle ORM en 'portal_rrhh'...");

  // Inicializar tablas directamente desde la definición de Drizzle ORM
  await ensureDrizzleSchema();

  // Limpiar tablas para idempotencia
  await pool.query("SET FOREIGN_KEY_CHECKS = 0;");
  await pool.query("TRUNCATE TABLE consultas_chat;");
  await pool.query("TRUNCATE TABLE reportes_diarios;");
  await pool.query("TRUNCATE TABLE documentos_vectores;");
  await pool.query("TRUNCATE TABLE movimientos_personal;");
  await pool.query("TRUNCATE TABLE incapacidades;");
  await pool.query("TRUNCATE TABLE solicitudes;");
  await pool.query("TRUNCATE TABLE saldos_vacaciones;");
  await pool.query("TRUNCATE TABLE colaboradores;");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1;");

  const defaultPasswordHash = await bcrypt.hash("PuraVida2026!", 10);

  // 1. Insertar Colaboradores con Drizzle ORM
  for (const c of NOMBRES_CR) {
    await db.insert(colaboradores).values({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      passwordHash: defaultPasswordHash,
      departamento: c.depto,
      puesto: c.puesto,
      fechaIngreso: c.ingreso,
      jefeId: c.jefeId,
      rol: c.rol,
      estado: c.estado,
    });
  }

  // 2. Insertar Saldos de Vacaciones con Drizzle ORM
  const alertaIds = new Set([1, 4, 6, 7, 9, 13, 22, 31, 45, 46]);
  for (const c of NOMBRES_CR) {
    const diasDisponibles = alertaIds.has(c.id) ? 21 + (c.id % 6) : c.id === 5 ? 14.5 : 12;
    const diasTomados = 4;
    const diasAsignados = diasDisponibles + diasTomados;

    await db.insert(saldosVacaciones).values({
      colaboradorId: c.id,
      periodo: "2025-2026",
      diasAsignados: diasAsignados.toFixed(2),
      diasTomados: diasTomados.toFixed(2),
      diasDisponibles: diasDisponibles.toFixed(2),
    });
  }

  // 3. Insertar Solicitudes con Drizzle ORM
  for (const cid of [11, 17, 27, 41]) {
    await db.insert(solicitudes).values({
      colaboradorId: cid,
      tipo: "vacaciones",
      fechaInicio: formatDate(daysAgo(2)),
      fechaFin: formatDate(daysFromNow(3)),
      estado: "aprobada",
      aprobadorId: 1,
      creadaEn: daysAgo(12),
    });
  }

  const pendientes = [
    { cid: 5, tipo: "vacaciones", inicio: daysFromNow(10), fin: daysFromNow(15), dias: 6 },
    { cid: 12, tipo: "vacaciones", inicio: daysFromNow(14), fin: daysFromNow(18), dias: 5 },
    { cid: 16, tipo: "permiso_con_goce", inicio: daysFromNow(5), fin: daysFromNow(6), dias: 7 },
    { cid: 21, tipo: "vacaciones", inicio: daysFromNow(20), fin: daysFromNow(27), dias: 4 },
    { cid: 33, tipo: "dia_cumpleanos", inicio: daysFromNow(4), fin: daysFromNow(4), dias: 5 },
  ];
  for (const p of pendientes) {
    await db.insert(solicitudes).values({
      colaboradorId: p.cid,
      tipo: p.tipo,
      fechaInicio: formatDate(p.inicio),
      fechaFin: formatDate(p.fin),
      estado: "pendiente",
      aprobadorId: 4,
      creadaEn: daysAgo(p.dias),
    });
  }

  // 4. Insertar Incapacidades con Drizzle ORM
  const incaps = [
    { cid: 15, tipo: "enfermedad_comun", inicio: daysAgo(2), dias: 5, entidad: "CCSS" as const },
    { cid: 23, tipo: "riesgo_trabajo", inicio: daysAgo(4), dias: 8, entidad: "INS" as const },
    { cid: 37, tipo: "enfermedad_comun", inicio: daysAgo(1), dias: 3, entidad: "CCSS" as const },
    { cid: 5, tipo: "enfermedad_comun", inicio: daysAgo(35), dias: 3, entidad: "CCSS" as const },
  ];
  for (const i of incaps) {
    await db.insert(incapacidades).values({
      colaboradorId: i.cid,
      tipo: i.tipo,
      fechaInicio: formatDate(i.inicio),
      dias: i.dias,
      entidad: i.entidad,
    });
  }

  // 5. Insertar Movimientos de Personal con Drizzle ORM
  const movs = [
    { cid: 51, tipo: "ingreso" as const, fecha: daysAgo(22), motivo: "Contratación Full-Stack" },
    { cid: 52, tipo: "ingreso" as const, fecha: daysAgo(14), motivo: "Plaza AI Prompt Engineer" },
    { cid: 53, tipo: "ingreso" as const, fecha: daysAgo(8), motivo: "Refuerzo Customer Success" },
    { cid: 54, tipo: "salida" as const, fecha: daysAgo(11), motivo: "Renuncia voluntaria" },
    { cid: 5, tipo: "ascenso" as const, fecha: daysAgo(18), motivo: "Promoción a Senior Engineer" },
  ];
  for (const m of movs) {
    await db.insert(movimientosPersonal).values({
      colaboradorId: m.cid,
      tipo: m.tipo,
      fecha: formatDate(m.fecha),
      motivo: m.motivo,
    });
  }

  // 6. Ingestar documentos vectorizados normativos
  console.log("📚 Ingestando y vectorizando corpus normativo de RRHH...");
  const { IngestionAgent } = await import("../agents/ingestionAgent");
  await IngestionAgent.syncDocuments();

  // 7. Generar reporte diario inicial
  console.log("📊 Generando reporte analítico inicial...");
  const { AnalystAgent } = await import("../agents/analystAgent");
  await AnalystAgent.generarReporteDiario(undefined, "seed.ts (inicial)");

  console.log("✅ Seed con Drizzle ORM completado exitosamente.");
}

if (require.main === module) {
  seedBackendDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Error en seed backend con Drizzle ORM:", err);
      pool.end();
      process.exit(1);
    });
}
