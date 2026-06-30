import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { supabaseClient } from "../../lib/supabase";
import { limiterAutenticacao } from "../middleware/rate-limit.middleware";

export const rotasAutenticacao = Router();

// ── Schemas de validação ──────────────────────────────────────────────────────

const schemaRegistro = z.object({
  nome:     z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email:    z.string().email("E-mail inválido"),
  senha:    z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
  segmento: z.string().optional(),
});

const schemaLogin = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});

// ── POST /api/auth/registrar ──────────────────────────────────────────────────

rotasAutenticacao.post("/registrar", limiterAutenticacao, async (req: Request, res: Response) => {
  const validacao = schemaRegistro.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({ erro: validacao.error.issues[0].message });
    return;
  }

  const { nome, email, senha, segmento } = validacao.data;
  const hashSenha = await bcrypt.hash(senha, 10);

  const { data: cliente, error } = await supabaseClient
    .from("clients")
    .insert({ name: nome, email, password_hash: hashSenha, segment: segmento ?? null })
    .select()
    .single();

  if (error) {
    const mensagem = error.code === "23505" ? "E-mail já cadastrado" : error.message;
    res.status(400).json({ erro: mensagem });
    return;
  }

  const token = jwt.sign(
    { clienteId: cliente.id, nome: cliente.name, email: cliente.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, cliente: { id: cliente.id, nome: cliente.name, email: cliente.email } });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

rotasAutenticacao.post("/login", limiterAutenticacao, async (req: Request, res: Response) => {
  const validacao = schemaLogin.safeParse(req.body);

  if (!validacao.success) {
    res.status(400).json({ erro: validacao.error.issues[0].message });
    return;
  }

  const { email, senha } = validacao.data;

  const { data: cliente, error } = await supabaseClient
    .from("clients")
    .select("id, name, email, password_hash, segment, created_at")
    .eq("email", email)
    .single();

  if (error || !cliente) {
    res.status(401).json({ erro: "E-mail ou senha inválidos" });
    return;
  }

  if (!cliente.password_hash) {
    res.status(401).json({ erro: "E-mail ou senha inválidos" });
    return;
  }

  const senhaValida = await bcrypt.compare(senha, cliente.password_hash);

  if (!senhaValida) {
    res.status(401).json({ erro: "E-mail ou senha inválidos" });
    return;
  }

  const token = jwt.sign(
    { clienteId: cliente.id, nome: cliente.name, email: cliente.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({ token, cliente: { id: cliente.id, nome: cliente.name, email: cliente.email } });
});