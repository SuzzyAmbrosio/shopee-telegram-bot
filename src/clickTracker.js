const express = require("express");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");

const app = express();
const PORT = process.env.PORT || 3000;

const linksFile = path.join(__dirname, "..", "tracked-links.json");
const clicksFile = path.join(__dirname, "..", "click-events.json");

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function criarLinkRastreavel({ produtoId, nome, categoria, horario, destino }) {
  const links = readJson(linksFile, {});
  const id = nanoid(10);

  links[id] = {
    id,
    produtoId,
    nome,
    categoria,
    horario,
    destino,
    createdAt: new Date().toISOString(),
    clicks: 0
  };

  writeJson(linksFile, links);

  const baseUrl = process.env.TRACKER_BASE_URL;
  if (!baseUrl) {
    throw new Error("TRACKER_BASE_URL não definido no .env");
  }

  return `${baseUrl}/click/${id}`;
}

app.get("/click/:id", (req, res) => {
  const { id } = req.params;
  const links = readJson(linksFile, {});
  const events = readJson(clicksFile, []);

  const item = links[id];

  if (!item) {
    return res.status(404).send("Link não encontrado.");
  }

  item.clicks = (item.clicks || 0) + 1;
  item.lastClickAt = new Date().toISOString();
  links[id] = item;

  events.push({
    id,
    produtoId: item.produtoId,
    nome: item.nome,
    categoria: item.categoria,
    horario: item.horario,
    destino: item.destino,
    clickedAt: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    userAgent: req.headers["user-agent"] || ""
  });

  writeJson(linksFile, links);
  writeJson(clicksFile, events);

  return res.redirect(item.destino);
});

app.get("/relatorio", (req, res) => {
  const links = readJson(linksFile, {});
  const lista = Object.values(links)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

  res.json(lista);
});

function iniciarTracker() {
  app.listen(PORT, () => {
    console.log(`📊 Tracker rodando na porta ${PORT}`);
  });
}

module.exports = {
  iniciarTracker,
  criarLinkRastreavel
};