import "dotenv/config";
import { supabaseClient } from "./supabase";

async function testConnection() {
  const { data, error } = await supabaseClient.from("clients").select("*");

  if (error) {
    console.error("Erro ao conectar ao Supabase:", error);
    process.exit(1);
  }

  console.log("✅ Supabase conectado com sucesso!");
  console.log(`   Registros em clients: ${data.length}`);
}

testConnection();
