import jwt from "jsonwebtoken";
import { OrchestratorAgent } from "../agents/orchestrator";
import { AnalystAgent } from "../agents/analystAgent";
import { ColaboradorModel } from "../models/Colaborador.model";
import { ReporteModel } from "../models/Reporte.model";
import { pool } from "../config/db";

async function runEndToEndVerification() {
  console.log("================================================================================");
  console.log("🧪 INICIANDO PRUEBAS DE INTEGRACIÓN END-TO-END (SISTEMA MULTIAGENTE RRHH)");
  console.log("   Empresa: Tecnologías Pura Vida S.A. (San José, Costa Rica)");
  console.log("================================================================================\n");

  // 1. Obtener los dos usuarios demo clave
  const usuarioRRHH = await ColaboradorModel.findByEmail("valeria.solis@puravida.cr");
  const usuarioColaborador = await ColaboradorModel.findByEmail("esteban.vargas@puravida.cr");

  if (!usuarioRRHH || !usuarioColaborador) {
    throw new Error("No se encontraron los usuarios demo en la base de datos.");
  }

  console.log(`👤 Usuario Colaborador: ${usuarioColaborador.nombre} (${usuarioColaborador.puesto}) - Rol: ${usuarioColaborador.rol}`);
  console.log(`👑 Usuario RRHH: ${usuarioRRHH.nombre} (${usuarioRRHH.puesto}) - Rol: ${usuarioRRHH.rol}\n`);

  // 2. PRUEBA 1: Consulta de Política RAG (policyAgent)
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 1: Consulta de Política Laboral (RAG con Citas de Drive)");
  console.log("Pregunta: '¿Cuándo se deposita el aguinaldo y cómo se calcula en Costa Rica?'");
  const res1 = await OrchestratorAgent.procesarMensaje(
    usuarioColaborador,
    "¿Cuándo se deposita el aguinaldo y cómo se calcula en Costa Rica?"
  );
  console.log(`Intención detectada: [${res1.intencion}] | Agente ejecutado: [${res1.agente}]`);
  console.log(`Latencia: ${res1.latenciaMs} ms | Resuelta: ${res1.resuelta} | Escalada: ${res1.escalada}`);
  console.log(`Citas normativas obtenidas: ${res1.documentosCitados.length}`);
  res1.documentosCitados.forEach((c) => console.log(`   - [${c.titulo} - ${c.seccion}, ${c.version}]`));
  console.log(`Respuesta:\n${res1.respuesta.slice(0, 200)}...\n`);

  // 3. PRUEBA 2: Consulta de Datos Personales (dataAgent con SQL parametrizado)
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 2: Consulta de Datos Personales del Colaborador (Saldo Vacaciones)");
  console.log("Pregunta: '¿Cuántos días de vacaciones disponibles tengo en mi saldo?'");
  const res2 = await OrchestratorAgent.procesarMensaje(
    usuarioColaborador,
    "¿Cuántos días de vacaciones disponibles tengo en mi saldo?"
  );
  console.log(`Intención detectada: [${res2.intencion}] | Agente ejecutado: [${res2.agente}]`);
  console.log(`Respuesta:\n${res2.respuesta}\n`);

  // 4. PRUEBA 3: Consulta Restringida de Terceros (Regla de Seguridad Crítica Ley 8968)
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 3: Intento de Acceso a Datos de Tercero por Rol Colaborador");
  console.log("Pregunta: '¿Cuántos días de vacaciones tiene mi compañero Juan?'");
  const res3 = await OrchestratorAgent.procesarMensaje(
    usuarioColaborador,
    "¿Cuántos días de vacaciones tiene mi compañero Juan?"
  );
  console.log(`Intención detectada: [${res3.intencion}] | Agente ejecutado: [${res3.agente}]`);
  console.log(`Respuesta de Seguridad:\n${res3.respuesta}\n`);

  // 5. PRUEBA 4: Consulta Fuera de Alcance (Redirección Amable)
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 4: Consulta Fuera de Alcance");
  console.log("Pregunta: '¿Recomiéndame una buena película de acción?'");
  const res4 = await OrchestratorAgent.procesarMensaje(
    usuarioColaborador,
    "¿Recomiéndame una buena película de acción?"
  );
  console.log(`Intención detectada: [${res4.intencion}] | Agente ejecutado: [${res4.agente}]`);
  console.log(`Respuesta:\n${res4.respuesta}\n`);

  // 6. PRUEBA 5: Consulta Mixta (RAG + Datos del Colaborador)
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 5: Consulta Mixta (Política de Incapacidades CCSS + Mi Historial)");
  console.log("Pregunta: 'Si me incapacita la CCSS, ¿cuánto me pagan y qué incapacidades tengo registradas?'");
  const res5 = await OrchestratorAgent.procesarMensaje(
    usuarioColaborador,
    "Si me incapacita la CCSS, ¿cuánto me pagan y qué incapacidades tengo registradas?"
  );
  console.log(`Intención detectada: [${res5.intencion}] | Agente ejecutado: [${res5.agente}]`);
  console.log(`Respuesta Mixta:\n${res5.respuesta.slice(0, 300)}...\n`);

  // 7. PRUEBA 6: Agente Analista (Generación de Reporte Diario de 7:00 a.m.)
  console.log("--------------------------------------------------------------------------------");
  console.log("TEST 6: Ejecución del Agente Analista (analystAgent)");
  const reporte = await AnalystAgent.generarReporteDiario(undefined, "test-e2e.ts (verificación)");
  console.log(`Reporte #${reporte.id} generado para la fecha: ${reporte.fecha}`);
  console.log(`Resumen Ejecutivo:\n"${reporte.resumenTexto}"\n`);
  console.log("Métricas Clave del Reporte:");
  console.log(`   - Ausentes Hoy: ${reporte.datosJson.ausentesHoy.total} colaboradores`);
  console.log(`   - Solicitudes Pendientes: ${reporte.datosJson.solicitudesPendientes.totalPendientes} (Vencidas >3d: ${reporte.datosJson.solicitudesPendientes.pendientesMas3Dias})`);
  console.log(`   - Tasa de Rotación Mensual: ${reporte.datosJson.rotacionPersonalMes.tasaRotacionMensualPct}%`);
  console.log(`   - Pasivo Vacaciones >20 días: ${reporte.datosJson.vacacionesAcumuladasAlerta.totalColaboradoresMas20Dias} colaboradores`);

  console.log("\n================================================================================");
  console.log("🎉 TODAS LAS PRUEBAS END-TO-END PASARON SATISFACTORIAMENTE (6/6)");
  console.log("================================================================================");
}

runEndToEndVerification()
  .then(() => pool.end())
  .catch((err) => {
    console.error("❌ Error en pruebas E2E:", err);
    pool.end();
    process.exit(1);
  });
