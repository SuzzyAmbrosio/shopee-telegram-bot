const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "enviados.json");

function carregarEnviados() {
  try {
    if (!fs.existsSync(arquivo)) {
      return [];
    }

    const conteudo = fs.readFileSync(arquivo, "utf8");
    return JSON.parse(conteudo || "[]");
  } catch (error) {
    console.error("Erro ao carregar enviados.json:", error.message);
    return [];
  }
}

function salvarEnviados(lista) {
  try {
    fs.writeFileSync(arquivo, JSON.stringify(lista, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar enviados.json:", error.message);
  }
}

function jaFoiEnviado(id) {
  const enviados = carregarEnviados();
  return enviados.includes(id);
}

function marcarComoEnviado(id) {
  const enviados = carregarEnviados();

  if (!enviados.includes(id)) {
    enviados.push(id);
    salvarEnviados(enviados);
  }
}

module.exports = {
  carregarEnviados,
  salvarEnviados,
  jaFoiEnviado,
  marcarComoEnviado
};