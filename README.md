# 🇨🇷 Portal de Consulta de Políticas de RRHH con RAG Multiagente
> **Empresa Simulada:** Tecnologías Pura Vida S.A. (San José, Costa Rica)  
> **Normativa Legal:** Código de Trabajo de Costa Rica & Ley N° 8968 (Protección de Datos Personales)  
> **Arquitectura:** Full-Stack Desacoplado (`/backend` Express MVC + `/frontend` React Vite)

---

## 🏛️ 1. Arquitectura del Sistema

El proyecto está dividido en dos aplicaciones independientes dentro del repositorio:

```text
mini proyecto 2/
├── backend/                       # Servidor REST API (MVC), Multiagente y Cron Jobs
│   ├── src/
│   │   ├── config/                # db.ts (MySQL pool), gemini.ts (768d), googleDrive.ts
│   │   ├── models/                # Colaborador, Documento, ConsultaLog, Reporte
│   │   ├── controllers/           # auth, chat, report, ingest controllers
│   │   ├── agents/                # orchestrator, policyAgent, dataAgent, analystAgent, ingestionAgent
│   │   ├── routes/                # auth, chat, reports, ingest routes
│   │   ├── middlewares/           # auth.middleware.ts (JWT RBAC)
│   │   ├── jobs/                  # dailyReport.cron.ts (07:00 a.m. Costa Rica)
│   │   ├── db/                    # seed.ts (55 colaboradores y 3 meses histórico)
│   │   └── index.ts               # Express Server en puerto 4000
│   ├── .env                       # Configuración MySQL portal_rrhh, JWT, Gemini
│   └── package.json
│
└── frontend/                      # Single Page Application (SPA)
    ├── src/
    │   ├── components/            # Navbar, ChatBox, CitationCard, KpiCards, ChartsPanel, PendingTable
    │   ├── pages/                 # LoginPage (1-Click Demo), ChatPage, DashboardPage
    │   ├── routes/                # AppRouter.jsx, ProtectedRoute.jsx
    │   ├── context/               # AuthContext.jsx
    │   ├── services/              # api.js (Axios con Bearer token)
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json               # React 18, Vite, Tailwind CSS, Recharts
```

---

## 🤖 2. Los 5 Agentes de Inteligencia Artificial

1. **`orchestrator.ts` (Orquestador y Seguridad):**
   - Único punto de contacto en el chat.
   - Clasifica la intención en: `politica`, `dato_personal`, `mixta`, `restringida`, `fuera_de_alcance`.
   - **Regla de Seguridad Crítica (Ley N° 8968):** Si un colaborador intenta consultar vacaciones o salarios de un compañero sin rol `rrhh`, bloquea la consulta inmediatamente. Redirige consultas no laborales.
2. **`policyAgent.ts` (Agente de Políticas RAG):**
   - Búsqueda por similitud coseno sobre `documentos_vectores` (768 dimensiones).
   - Genera citas exactas a Google Drive: `[Título - Sección, vX.X] (enlace Drive)`.
   - **Cero Alucinaciones:** Si la similitud es `< 0.72` o la política no existe, admite la falta de información y activa el botón **"Escalar caso a RRHH"**.
3. **`dataAgent.ts` (Agente de Datos del Colaborador):**
   - Consultas SQL de solo lectura estrictamente parametrizadas con el `colaborador_id` de la sesión autenticada.
   - Responde saldo de vacaciones, solicitudes, incapacidades y fechas de pago SINPE.
4. **`analystAgent.ts` (Agente Analista de Reportes):**
   - Ejecuta **7 agregaciones SQL exactas** (ausentes hoy, solicitudes vencidas >3d, incapacidades CCSS/INS, rotación mensual %, pasivo de vacaciones >20d, métricas del chatbot).
   - El LLM tiene estrictamente prohibido inventar números; redacta un resumen ejecutivo de **3 a 5 frases** narrando el JSON.
   - Se ejecuta a las **07:00 a.m.** vía `node-cron` y cuenta con botón manual en el panel de RRHH.
5. **`ingestionAgent.ts` (Agente de Ingesta y Drive):**
   - Conecta con Google Drive API para procesar **PDF, Google Docs y Google Sheets**.
   - Chunking de **500 a 1000 tokens** con solapamiento respetando encabezados normativos (`Sección`, `Artículo`, `#`).
   - Genera embeddings de 768 dimensiones (`text-embedding-004`) y actualiza `documentos_vectores`.

---

## 🔑 3. Credenciales Demo de Acceso Rápido

En la pantalla de Login (**[http://localhost:5173](http://localhost:5173)**) puedes usar los botones de acceso 1-Click:

| Rol | Colaborador Demo | Correo Electrónico | Contraseña | Vistas Habilitadas |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Rol RRHH** | Valeria Solís Elizondo (Directora) | `valeria.solis@puravida.cr` | `PuraVida2026!` | Chat + **Dashboard Ejecutivo**, KPIs, Recharts y Reportes Diarios |
| **💻 Rol Colaborador** | Esteban Vargas Cascante (Ingeniero) | `esteban.vargas@puravida.cr` | `PuraVida2026!` | Chat de Políticas RAG, su saldo de vacaciones (14.5 días) y trámites propios |

---

## 🚀 4. Puesta en Marcha en Desarrollo

### Prerrequisitos:
- Node.js v18+ instalado.
- MySQL Server 8.0+ activo con base de datos `portal_rrhh`.

### Paso 1: Configurar Base de Datos y Poblado
```bash
# Desde la carpeta /backend
cd backend
npm install
npm run db:seed    # Inserta los 55 colaboradores y las políticas vectorizadas
```

### Paso 2: Iniciar Servidores
Abre dos terminales:

```bash
# Terminal 1: Backend API (Puerto 4000)
cd backend
npm run dev
```

```bash
# Terminal 2: Frontend SPA (Puerto 5173)
cd frontend
npm install
npm run dev
```

Abre tu navegador en: 👉 **`http://localhost:5173`**

---

## 🧪 5. Pruebas Automatizadas End-to-End
Para verificar el flujo multiagente y todas las reglas de negocio sin abrir el navegador:

```bash
cd backend
npx tsx src/scripts/test-e2e.ts
```
*Ejecuta 6 pruebas de integración verificando RAG, datos personales, bloqueo por Ley 8968, desvío fuera de alcance, consulta mixta y reporte analítico.*

---

## 📄 Licencia
Proyecto desarrollado para fines académicos y de evaluación de sistemas Multiagente con RAG.
Tecnologías Pura Vida S.A. es una entidad ficticia para Costa Rica.
