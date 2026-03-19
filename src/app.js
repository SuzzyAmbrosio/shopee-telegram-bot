require("dotenv").config();

const cron = require("node-cron");
const { buscarPromocoesShopee, generateShortLink } = require("./shopee");
const { enviarProdutoTelegram } = require("./telegram");
const { formatarMensagem } = require("./formatter");
const { jaFoiEnviado, marcarComoEnviado } = require("./storage");

const CONFIG_POSTAGENS = {
  "08:30": {
    quantidade: 2,
    categoriasPrioritarias: ["COZINHA", "DECORACAO", "OFERTAS"]
  },
  "12:30": {
    quantidade: 3,
    categoriasPrioritarias: ["COZINHA", "BELEZA", "ELETRONICOS", "OFERTAS"]
  },
  "18:30": {
    quantidade: 3,
    categoriasPrioritarias: ["LIMPEZA", "DECORACAO", "COZINHA", "OFERTAS"]
  },
  "21:00": {
    quantidade: 2,
    categoriasPrioritarias: ["ELETRONICOS", "BELEZA", "SAUDE", "OFERTAS"]
  }
};

function passaNoFiltro(produto) {
  const vendas = Number(produto.vendas || 0);
  const comissaoRate = Number(produto.comissaoRate || 0);
  const preco = Number(produto.preco || 0);

  return (
    preco > 0 &&
    vendas >= 100 &&
    comissaoRate >= 0.08 &&
    !!produto.link
  );
}

function ordenarPorPrioridadeCategoria(produtos, categoriasPrioritarias = []) {
  return [...produtos].sort((a, b) => {
    const ia = categoriasPrioritarias.indexOf(a.categoria);
    const ib = categoriasPrioritarias.indexOf(b.categoria);

    const pa = ia === -1 ? 999 : ia;
    const pb = ib === -1 ? 999 : ib;

    if (pa !== pb) return pa - pb;
    return b.score - a.score;
  });
}

function selecionarVariados(produtos, quantidade, categoriasPrioritarias) {
  const ordenados = ordenarPorPrioridadeCategoria(produtos, categoriasPrioritarias);

  const usadosPorCategoria = {};
  const selecionados = [];

  for (const produto of ordenados) {
    const cat = produto.categoria || "OFERTAS";
    usadosPorCategoria[cat] = usadosPorCategoria[cat] || 0;

    if (usadosPorCategoria[cat] >= 1 && selecionados.length < quantidade - 1) {
      continue;
    }

    selecionados.push(produto);
    usadosPorCategoria[cat] += 1;

    if (selecionados.length >= quantidade) {
      break;
    }
  }

  if (selecionados.length < quantidade) {
    for (const produto of ordenados) {
      if (selecionados.find((p) => p.id === produto.id)) continue;
      selecionados.push(produto);
      if (selecionados.length >= quantidade) break;
    }
  }

  return selecionados;
}

async function prepararProdutoComLinkRastreavel(produto, slotHorario) {
  const categoriaSlug = String(produto.categoria || "ofertas").toLowerCase();

  const shortLink = await generateShortLink(
    produto.link,
    "telegram",
    slotHorario.replace(":", ""),
    categoriaSlug
  );

  return {
    ...produto,
    link: shortLink
  };
}

async function postarLote(slotHorario) {
  const config = CONFIG_POSTAGENS[slotHorario];

  if (!config) {
    console.log(`Nenhuma configuração encontrada para ${slotHorario}`);
    return;
  }

  console.log(`\n⏰ Rodando lote do horário ${slotHorario}`);

  const todos = await buscarPromocoesShopee();

  const filtrados = todos.filter((produto) => {
    if (!produto.id) return false;
    if (jaFoiEnviado(produto.id)) return false;
    return passaNoFiltro(produto);
  });

  console.log(`📦 Produtos filtrados disponíveis: ${filtrados.length}`);

  const selecionados = selecionarVariados(
    filtrados,
    config.quantidade,
    config.categoriasPrioritarias
  );

  console.log(`✅ Selecionados para ${slotHorario}: ${selecionados.length}`);

  for (const produto of selecionados) {
    try {
      const preparado = await prepararProdutoComLinkRastreavel(produto, slotHorario);
      const mensagem = formatarMensagem(preparado);

      await enviarProdutoTelegram({
        imagem: preparado.imagem,
        mensagem
      });

      marcarComoEnviado(preparado.id);

      console.log(
        `🚀 Enviado: ${preparado.nome} | categoria=${preparado.categoria} | vendas=${preparado.vendas} | comissão=${preparado.comissaoRate}`
      );
    } catch (erroProduto) {
      console.error(`❌ Erro ao enviar ${produto.nome}:`);
      console.error(erroProduto.response?.data || erroProduto.message);
    }
  }

  console.log(`🏁 Lote ${slotHorario} finalizado.\n`);
}

function registrarAgendamentos() {
  cron.schedule("30 8 * * 1-6", async () => {
    await postarLote("08:30");
  }, { timezone: "America/Fortaleza" });

  cron.schedule("30 12 * * 1-6", async () => {
    await postarLote("12:30");
  }, { timezone: "America/Fortaleza" });

  cron.schedule("30 18 * * 1-6", async () => {
    await postarLote("18:30");
  }, { timezone: "America/Fortaleza" });

  cron.schedule("0 21 * * 1-6", async () => {
    await postarLote("21:00");
  }, { timezone: "America/Fortaleza" });

  console.log("📅 Agendamentos ativos:");
  console.log("- 08:30 → 2 produtos");
  console.log("- 12:30 → 3 produtos");
  console.log("- 18:30 → 3 produtos");
  console.log("- 21:00 → 2 produtos");
}

// TESTE MANUAL
postarLote("12:30");

registrarAgendamentos();