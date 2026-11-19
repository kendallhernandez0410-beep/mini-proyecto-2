import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  id: number;
  nombre: string;
  email: string;
  departamento: string;
  puesto: string;
  rol: "colaborador" | "rrhh";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "super_secreto_pura_vida_rrhh_costa_rica_2026";

/**
 * Middleware para autenticar solicitudes mediante JWT Bearer token.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Acceso no autorizado. Token JWT no proporcionado.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({
      success: false,
      error: "Token JWT inválido o expirado.",
    });
    return;
  }
}

/**
 * Middleware para restringir endpoints exclusivamente a un rol específico (ej. 'rrhh').
 */
export function requireRole(role: "rrhh" | "colaborador") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Usuario no autenticado." });
      return;
    }

    if (req.user.rol !== role) {
      res.status(403).json({
        success: false,
        error: `Acceso restringido. Esta acción requiere el rol de '${role.toUpperCase()}'.`,
      });
      return;
    }

    next();
  };
}
