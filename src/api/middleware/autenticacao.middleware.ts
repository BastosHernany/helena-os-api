import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface RequisicaoAutenticada extends Request {
  clienteId?: string;
}

export function middlewareAutenticacao(req: RequisicaoAutenticada, res: Response, next: NextFunction): void {
  const cabecalhoAuth = req.headers.authorization;

  if (!cabecalhoAuth || !cabecalhoAuth.startsWith("Bearer ")) {
    res.status(401).json({ erro: "Token nao fornecido" });
    return;
  }

  const token = cabecalhoAuth.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { clienteId: string };
    req.clienteId = payload.clienteId;
    next();
  } catch {
    res.status(401).json({ erro: "Token invalido ou expirado" });
  }
}
