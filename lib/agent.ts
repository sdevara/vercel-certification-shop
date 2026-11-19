import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  type UIToolInvocation,
} from "ai";
import { searchProducts, getAllCategories, getProductDetails, returnOrder } from "@/lib/tools";

export const shoppingAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-5",
  instructions: `You are a helpful assistant for the Vercel swag store. When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
  When asked about a type or category of product use the getAllCategories tool for getting valid categories before using searchProducts.
  Whenever the user asks about a specific item (e.g. "Tell me more about the black hoodie", "Is the water bottle in stock?"), first use searchProducts to find its id or slug if you don't have it, then ALWAYS call getProductDetails with that id/slug and answer from its result. Use searchProducts for broad browsing/comparison and getProductDetails for one specific item. The chat UI automatically shows a product card (images, price, tags, stock) for both tools, so don't repeat image links or a full price/spec list in text; just add a short helpful summary. Do not rely on the fields searchProducts returns for single-item questions, and never guess stock or sizes.
  When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
  tools: { searchProducts, getAllCategories, getProductDetails, returnOrder },
});
export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;