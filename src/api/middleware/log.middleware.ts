import { Request, Response, NextFunction } from "express";

export function middlewareLog(req: Request, res: Response, next: NextFunction): void {
  const inicio = Date.now();

  res.on("finish", () => {
    const duracao = Date.now() - inicio;
    const timestamp = new Date().toISOString();
    process.stdout.write(`[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duracao}ms\n`);
  });

  next();
}
