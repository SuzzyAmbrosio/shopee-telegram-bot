function formatarMoeda(valor) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function emojiCategoria(categoria) {
  switch (categoria) {
    case "DECORACAO":
      return "🛏️";
    case "COZINHA":
      return "🍳";
    case "BELEZA":
      return "💄";
    case "ELETRONICOS":
      return "📱";
    case "LIMPEZA":
      return "🧼";
    case "SAUDE":
      return "💊";
    case "PET":
      return "🐶";
    default:
      return "🛍️";
  }
}

function tituloCategoria(categoria) {
  switch (categoria) {
    case "DECORACAO":
      return "DECORAÇÃO";
    case "COZINHA":
      return "COZINHA";
    case "BELEZA":
      return "BELEZA";
    case "ELETRONICOS":
      return "ELETRÔNICOS";
    case "LIMPEZA":
      return "LIMPEZA";
    case "SAUDE":
      return "SAÚDE";
    case "PET":
      return "PET";
    default:
      return "OFERTAS";
  }
}

function gerarTituloChamativo(nome) {
  return String(nome || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function gerarDescricaoPequena(produto) {
  const nome = String(produto.nome || "").toLowerCase();
  const categoria = produto.categoria || "OFERTAS";

  if (categoria === "COZINHA") {
    if (nome.includes("bowl") || nome.includes("tigela")) {
      return "Perfeito para sobremesas, petiscos e porções do dia a dia, deixando sua mesa mais bonita e elegante.";
    }

    if (nome.includes("organizador")) {
      return "Ideal para deixar sua cozinha mais organizada, prática e com tudo no lugar sem complicação.";
    }

    if (nome.includes("prateleira")) {
      return "Uma ótima opção para aproveitar melhor o espaço e manter tudo bem arrumado.";
    }

    return "Um item super útil para facilitar a rotina e deixar sua casa ainda mais prática.";
  }

  if (categoria === "DECORACAO") {
    return "Perfeito para dar um toque mais bonito, elegante e aconchegante ao ambiente.";
  }

  if (categoria === "BELEZA") {
    return "Uma ótima escolha para turbinar sua rotina de cuidados e beleza no dia a dia.";
  }

  if (categoria === "ELETRONICOS") {
    return "Ideal para quem busca mais praticidade, tecnologia e utilidade em um só produto.";
  }

  if (categoria === "LIMPEZA") {
    return "Ajuda a facilitar a limpeza da casa e deixa a rotina muito mais prática.";
  }

  if (categoria === "SAUDE") {
    return "Pensado para trazer mais conforto, cuidado e bem-estar para sua rotina.";
  }

  if (categoria === "PET") {
    return "Perfeito para cuidar do seu pet com mais praticidade, conforto e carinho.";
  }

  return "Uma oferta que vale a pena para quem gosta de praticidade, utilidade e bom custo-benefício.";
}

function formatarMensagem(produto) {
  const categoria = produto.categoria || "OFERTAS";
  const categoriaBonita = tituloCategoria(categoria);
  const emoji = emojiCategoria(categoria);
  const titulo = gerarTituloChamativo(produto.nome);
  const descricao = gerarDescricaoPequena(produto);

  let texto = `#SELEÇÃO ${categoriaBonita}\n\n`;
  texto += `${emoji} ${titulo} ✨\n\n`;
  texto += `${descricao}\n\n`;

  if (produto.precoOriginal && Number(produto.precoOriginal) > Number(produto.preco)) {
    texto += `💸 De: ${formatarMoeda(produto.precoOriginal)}\n`;
  }

  texto += `💸 Por: ${formatarMoeda(produto.preco)}\n\n`;
  texto += `🛒 Compre aqui:\n${produto.link}\n\n`;
  texto += `🎯 Preço e condições sujeitos à alteração a qualquer momento.`;

  return texto;
}

module.exports = {
  formatarMensagem
};