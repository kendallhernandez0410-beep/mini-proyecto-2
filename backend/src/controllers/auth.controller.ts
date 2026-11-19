import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ColaboradorModel } from "../models/Colaborador.model";

const JWT_SECRET = process.env.JWT_SECRET || "super_secreto_pura_vida_rrhh_costa_rica_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: "Debe ingresar el correo institucional y la contraseña.",
        });
        return;
      }

      const colaborador = await ColaboradorModel.findByEmail(email.toLowerCase().trim());
      if (!colaborador) {
        res.status(401).json({
          success: false,
          error: "Credenciales inválidas. Correo electrónico no registrado.",
        });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, colaborador.passwordHash);
      if (!passwordMatch) {
        res.status(401).json({
          success: false,
          error: "Credenciales inválidas. Contraseña incorrecta.",
        });
        return;
      }

      // Generar token JWT con información del rol RBAC
      const payload = {
        id: colaborador.id,
        nombre: colaborador.nombre,
        email: colaborador.email,
        departamento: colaborador.departamento,
        puesto: colaborador.puesto,
        rol: colaborador.rol,
      };

      const token = jwt.sign(payload, JWT_SECRET as jwt.Secret, {
        expiresIn: "24h",
      });

      res.json({
        success: true,
        message: "Autenticación exitosa.",
        token,
        usuario: payload,
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({
        success: false,
        error: "Error interno al procesar el inicio de sesión.",
      });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: "No autenticado." });
      return;
    }

    const colaborador = await ColaboradorModel.findById(req.user.id);
    res.json({
      success: true,
      usuario: colaborador,
    });
  }

  static async getDemoUsers(req: Request, res: Response): Promise<void> {
    // Usuarios predeterminados para pruebas rápidas
    const demoUsers = [
      {
        nombre: "Valeria Solís Elizondo",
        email: "valeria.solis@puravida.cr",
        rol: "rrhh",
        puesto: "Directora de Capital Humano",
        departamento: "Recursos Humanos",
        passwordSugerida: "PuraVida2026!",
        descripcion: "Acceso total a Chat, Dashboard analítico, métricas y reportes diarios.",
      },
      {
        nombre: "Esteban Vargas Cascante",
        email: "esteban.vargas@puravida.cr",
        rol: "colaborador",
        puesto: "Senior Full-Stack Engineer",
        departamento: "Ingeniería de Software",
        passwordSugerida: "PuraVida2026!",
        descripcion: "Acceso a consultas de políticas, su saldo de vacaciones (14.5d) y trámites personales.",
      },
      {
        nombre: "Mauricio Brenes Araya",
        email: "mauricio.brenes@puravida.cr",
        rol: "rrhh",
        puesto: "Especialista de Nómina y Legislación Laboral",
        departamento: "Recursos Humanos",
        passwordSugerida: "PuraVida2026!",
        descripcion: "Rol de RRHH enfocado en compensación, incapacidades y nómina.",
      },
    ];

    res.json({ success: true, demoUsers });
  }
}
