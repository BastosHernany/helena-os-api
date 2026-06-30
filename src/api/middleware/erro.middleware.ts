import { Request, Response, NextFunction } from "express";

export function middlewareErro(err: unknown, req: Request, res: Response, next: NextFunction): void {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor" });
}
