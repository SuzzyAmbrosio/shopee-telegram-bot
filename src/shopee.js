const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const SHOPEE_GRAPHQL_URL = "https://open-api.affiliate.shopee.com.br/graphql";

/**
 * Gera SHA256 em hexadecimal
 */
function gerarSha256(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex");
}

/**
 * Monta headers de autenticação da Shopee
 */
function getAuthHeaders(payload) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId) {
    throw new Error("SHOPEE_APP_ID não foi definido no .env");
  }

  if (!secret) {
    throw new Error("SHOPEE_SECRET não foi definido no .env");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signatureBase = `${appId}${timestamp}${payload}${secret}`;
  const signature = gerarSha256(signatureBase);

  return {
    "Content-Type": "application/json",
    Authorization: `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`
  };
}

/**
 * Faz requisição GraphQL para a Shopee
 */
async function graphqlRequest(query, variables = {}) {
  const payloadObj = { query, variables };
  const payload = JSON.stringify(payloadObj);

  const response = await axios.post(SHOPEE_GRAPHQL_URL, payloadObj, {
    headers: getAuthHeaders(payload)
  });

  if (response.data?.errors) {
    throw new Error(`Erro GraphQL Shopee: ${JSON.stringify(response.data.errors)}`);
  }

  return response.data?.data;
}

/**
 * Converte valor para número com segurança
 */
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Remove acentos e caracteres inválidos para subIds
 */
function sanitizarSubId(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")     // só letras, números e hífen
    .replace(/-+/g, "-")             // evita hífen repetido
    .replace(/^-|-$/g, "")           // remove hífen do começo/fim
    .slice(0, 30);                   // limita tamanho
}

/**
 * Define categoria por palavras do nome
 */
function categorizarProduto(nome = "") {
  const n = nome.toLowerCase();

  if (/(cama|colcha|lençol|travesseiro|edredom|queen|casal|decora|cortina|almofada)/.test(n)) {
    return "DECORACAO";
  }

  if (/(cozinha|panela|filtro|torneira|geladeira|organizador|porta tempero|utensílio|pote|air fryer)/.test(n)) {
    return "COZINHA";
  }

  if (/(beleza|maquiagem|perfume|escova|secador|chapinha|joias|skincare)/.test(n)) {
    return "BELEZA";
  }

  if (/(iphone|carregador|fone|tablet|smartwatch|teclado|mouse|caixa de som|eletrônic)/.test(n)) {
    return "ELETRONICOS";
  }

  if (/(limpeza|esponja|vidro|box|lavanderia|detergente|removedor|pano)/.test(n)) {
    return "LIMPEZA";
  }

  if (/(saúde|massageador|glicose|vitamina|postura|ortop)/.test(n)) {
    return "SAUDE";
  }

  if (/(pet|cachorro|gato|ração|coleira)/.test(n)) {
    return "PET";
  }

  return "OFERTAS";
}

/**
 * Calcula score do produto
 */
function scoreProduto(produto) {
  const vendas = toNumber(produto.vendas);
  const comissaoRate = toNumber(produto.comissaoRate);
  const desconto = toNumber(produto.descontoPercentual);
  const rating = toNumber(produto.ratingStar);
  const comissaoValor = toNumber(produto.comissao);

  return (
    vendas * 0.05 +
    comissaoRate * 1000 +
    desconto * 1.5 +
    rating * 8 +
    comissaoValor * 10
  );
}

/**
 * Normaliza resposta da Shopee
 */
function normalizarProduto(item) {
  const nome = item.productName || "Produto sem nome";
  const preco =
    toNumber(item.priceMin) ||
    toNumber(item.priceMax) ||
    toNumber(item.price);

  const produto = {
    id: String(item.itemId || ""),
    nome,
    categoria: categorizarProduto(nome),
    preco,
    precoOriginal: null,
    descontoPercentual: toNumber(item.priceDiscountRate),
    vendas: toNumber(item.sales),
    comissao: toNumber(item.commission),
    comissaoRate: toNumber(item.commissionRate),
    ratingStar: toNumber(item.ratingStar),
    link: item.offerLink || item.productLink || "",
    imagem: item.imageUrl || "",
    loja: item.shopName || "",
    score: 0
  };

  produto.score = scoreProduto(produto);
  return produto;
}

/**
 * Busca uma lista de produtos pela query GraphQL
 */
async function buscarLista(query) {
  const data = await graphqlRequest(query);
  const nodes = data?.productOfferV2?.nodes || [];
  return nodes.map(normalizarProduto);
}

/**
 * Gera short link com subIds sanitizados
 * Se falhar, usa o link original
 */
async function generateShortLink(url, subId1 = "", subId2 = "", subId3 = "") {
  try {
    const query = `
      mutation GenerateShortLink($input: ShortLinkInput!) {
        generateShortLink(input: $input) {
          shortLink
        }
      }
    `;

    const subIds = [subId1, subId2, subId3]
      .map(sanitizarSubId)
      .filter(Boolean)
      .slice(0, 5);

    const data = await graphqlRequest(query, {
      input: {
        originUrl: url,
        subIds
      }
    });

    return data?.generateShortLink?.shortLink || url;
  } catch (error) {
    console.error("Falha ao gerar short link, usando link original:", error.message);
    return url;
  }
}

/**
 * Busca promoções combinando:
 * - maior comissão
 * - top performance
 * - key seller
 */
async function buscarPromocoesShopee() {
  const campos = `
    itemId
    productName
    offerLink
    productLink
    imageUrl
    priceMin
    priceMax
    priceDiscountRate
    sales
    ratingStar
    commissionRate
    commission
    shopName
  `;

  const qMaiorComissao = `
    query {
      productOfferV2(
        listType: 1,
        sortType: 5,
        page: 1,
        limit: 40,
        isAMSOffer: true
      ) {
        nodes { ${campos} }
      }
    }
  `;

  const qTopPerformance = `
    query {
      productOfferV2(
        listType: 2,
        sortType: 2,
        page: 1,
        limit: 40
      ) {
        nodes { ${campos} }
      }
    }
  `;

  const qKeySeller = `
    query {
      productOfferV2(
        listType: 0,
        sortType: 2,
        page: 1,
        limit: 40,
        isAMSOffer: true,
        isKeySeller: true
      ) {
        nodes { ${campos} }
      }
    }
  `;

  const [lista1, lista2, lista3] = await Promise.all([
    buscarLista(qMaiorComissao),
    buscarLista(qTopPerformance),
    buscarLista(qKeySeller)
  ]);

  const mapa = new Map();

  for (const item of [...lista1, ...lista2, ...lista3]) {
    if (!item.id) continue;
    if (!item.link) continue;

    if (!mapa.has(item.id) || item.score > mapa.get(item.id).score) {
      mapa.set(item.id, item);
    }
  }

  return Array.from(mapa.values()).sort((a, b) => b.score - a.score);
}

module.exports = {
  buscarPromocoesShopee,
  generateShortLink
};