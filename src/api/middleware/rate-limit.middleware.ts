import rateLimit from "express-rate-limit";

export const limiterAutenticacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const limiterGeral = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: "Muitas requisicoes. Tente novamente em instantes.",
  standardHeaders: true,
  legacyHeaders: false,
});
