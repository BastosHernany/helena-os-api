import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabaseClient } from "../../lib/supabase";

export const rotasAutenticacao = Router();

rotasAutenticacao.post("/registrar", async (req: Request, res: Response) => {
  const { nome, email, senha, segmento } = req.body;

  if (!nome || !email || !senha) {
    res.status(400).json({ erro: "nome, email e senha sao obrigatorios" });
    return;
  }

  const hashSenha = await bcrypt.hash(senha, 10);

  const { data: cliente, error } = await supabaseClient
    .from("clients")
    .insert({ name: nome, email, password_hash: hashSenha, segment: segmento ?? null })
    .select()
    .single();

  if (error) {
    res.status(400).json({ erro: error.message });
    return;
  }

  const token = jwt.sign(
    { clienteId: cliente.id, nome: cliente.name, email: cliente.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, cliente: { id: cliente.id, nome: cliente.name, email: cliente.email } });
});

rotasAutenticacao.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    res.status(400).json({ erro: "email e senha sao obrigatorios" });
    return;
  }

  const { data: cliente, error } = await supabaseClient
    .from("clients")
    .select("id, name, email, password_hash, segment, created_at")
    .eq("email", email)
    .single();

  console.log("[login] cliente encontrado:", !!cliente, "| hash presente:", !!cliente?.password_hash, "| erro supabase:", error?.message ?? null);

  if (error || !cliente) {
    res.status(401).json({ erro: "Credenciais invalidas" });
    return;
  }

  if (!cliente.password_hash) {
    console.log("[login] password_hash ausente no retorno do Supabase — verifique as policies RLS da tabela clients");
    res.status(401).json({ erro: "Credenciais invalidas" });
    return;
  }

  const senhaValida = await bcrypt.compare(senha, cliente.password_hash);
  console.log("[login] bcrypt.compare resultado:", senhaValida);
  if (!senhaValida) {
    res.status(401).json({ erro: "Credenciais invalidas" });
    return;
  }

  const token = jwt.sign(
    { clienteId: cliente.id, nome: cliente.name, email: cliente.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({ token, cliente: { id: cliente.id, nome: cliente.name, email: cliente.email } });
});
