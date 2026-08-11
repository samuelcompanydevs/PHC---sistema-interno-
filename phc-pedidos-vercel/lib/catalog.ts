export type Product = {
  id: string;
  name: string;
  shortName: string;
  category: "Espetinhos" | "Combos" | "Bebidas";
  price: number;
  emoji: string;
};

export const products: Product[] = [
  { id: "carne", name: "Espetinho de carne", shortName: "Carne", category: "Espetinhos", price: 12, emoji: "🥩" },
  { id: "mistao", name: "Espetinho mistão", shortName: "Mistão", category: "Espetinhos", price: 10, emoji: "🍢" },
  { id: "linguica", name: "Espetinho de linguiça", shortName: "Linguiça", category: "Espetinhos", price: 10, emoji: "🌭" },
  { id: "coracao", name: "Espetinho de coração", shortName: "Coração", category: "Espetinhos", price: 10, emoji: "❤️" },
  { id: "frango", name: "Espetinho de frango", shortName: "Frango", category: "Espetinhos", price: 10, emoji: "🍗" },
  { id: "kafta", name: "Espetinho de kafta", shortName: "Kafta", category: "Espetinhos", price: 12, emoji: "🔥" },
  { id: "medalhao-frango", name: "Medalhão de frango", shortName: "Med. frango", category: "Espetinhos", price: 12, emoji: "🍗" },
  { id: "medalhao-carne", name: "Medalhão de carne", shortName: "Med. carne", category: "Espetinhos", price: 12, emoji: "🥓" },
  { id: "espeto-pao", name: "Espeto no pão", shortName: "Espeto no pão", category: "Combos", price: 15, emoji: "🥖" },
  { id: "marmitinha", name: "Marmitinha de churrasco", shortName: "Marmitinha", category: "Combos", price: 16, emoji: "🍱" },
  { id: "cerveja", name: "Cerveja Original/Skol", shortName: "Cerveja", category: "Bebidas", price: 7, emoji: "🍺" },
  { id: "refrigerante", name: "Refrigerante", shortName: "Refrigerante", category: "Bebidas", price: 7, emoji: "🥤" },
  { id: "garrafinha", name: "Garrafinha de água", shortName: "Água", category: "Bebidas", price: 4.5, emoji: "💧" },
  { id: "suco", name: "Suco", shortName: "Suco", category: "Bebidas", price: 8, emoji: "🧃" },
  { id: "acai", name: "Vitamina de açaí", shortName: "Açaí", category: "Bebidas", price: 12, emoji: "🫐" },
];

export const productById = new Map(products.map((product) => [product.id, product]));

