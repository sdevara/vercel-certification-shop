import { tool } from "ai";
import { z } from "zod";
import { ApiRequestError, createReturn, getCategories, getOrder, getProductById, getProducts, getProductStock, preauthorizeRefund, notifyReturnInProcess } from "@/lib/api";
import { start } from "workflow/api";
import { returnFlow } from "./workflows/return-flow";

export const searchProducts = tool({
  description: `Search the Vercel swag store product catalog. BROAD LOOKUP: use this to browse, discover or compare several products ("what hoodies do you have?", "show me something under $30") and to find the id/slug of an item the user named. Returns up to 10 products with only summary fields (one image, price, short info, NO stock). Do NOT use it to answer detailed questions about one specific item (stock, sizes, full description); once you know which item the user means, call getProductDetails. Optionally narrow results to a single category.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        `Optional free-text search terms describing what the user is looking for, e.g. 'hoodie' or 'water bottle'.`,
      ),
    category: z
      .string()
      .optional()
      .describe(
        `Optional category slug to filter results. Only set this when the user clearly wants a specific category. Use the getAllCategories tool to get all valid categories.`,
      ),
  }),
  execute: async ({ query, category }) => {
    "use step";

    try {
      const products = await getProducts({
        search: query,
        category,
        limit: 10,
      });
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          image: p.images[0],
          price: p.price,
          currency: p.currency,
          category: p.category,
          description: p.description,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, products: [], error: message };
    }
  },
});

export const getProductDetails = tool({
  description: `Get the full details of ONE specific product (description, price, images, tags such as sizes/colors, category, and live stock). SINGLE-ITEM LOOKUP: use this whenever the user asks about ONE specific product ("Tell me more about the black hoodie", "Is the water bottle in stock?", "What sizes does it come in?"). It returns every image, the full description, tags (sizes/colors) and LIVE stock, which searchProducts does not. Requires the product's id or slug; if you only have a name, call searchProducts first to find it, then call this. Do NOT use it to browse or compare many products. The UI already renders a product card from this result, so don't repeat the image or a full spec list in your reply.`,
  inputSchema: z.object({
    productId: z
      .string()
      .describe(
        `The product's id or slug, as returned by searchProducts (e.g. 'black-hoodie').`,
      ),
  }),
  execute: async ({ productId }) => {
    "use step";
    try {
      // Fetch details and live stock in parallel; they're independent requests.
      const [product, stock] = await Promise.all([
        getProductById(productId),
        getProductStock(productId),
      ]);
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        images: product.images,
        tags: product.tags,
        featured: product.featured,
        stock: {
          quantity: stock.stock,
          inStock: stock.inStock,
          lowStock: stock.lowStock,
        },
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});

export const getAllCategories = tool({
  description: `List every product category available in the Vercel swag store, along with the number of products in each. Use this when the user asks what categories exist, what kinds of products are sold, or wants to browse the store at a high level.`,
  inputSchema: z.object({}),
  execute: async () => {
    "use step";
    try {
      const categories = await getCategories();
      return {
        count: categories.length,
        categories: categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          productCount: c.productCount,
        })),
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { count: 0, categories: [], error: message };
    }
  },
});

export const returnOrder = tool({
  description: `File a return for one of the user's past orders. The user must provide an order ID and a reason. Example order IDs: 11111, 22222, 33333.`,
  inputSchema: z.object({
    orderId: z
      .string()
      .describe("The order ID the user wants to return."),
    reason: z
      .string()
      .min(10)
      .max(500)
      .describe("Why the user is returning the order."),
  }),
  execute: async ({ orderId, reason }) => {
    "use step";
    try {
      // Hand the work to the durable returnFlow workflow (its steps retry on failure).
      const run = await start(returnFlow, [orderId, reason]);
      return {
        runId: run.runId,
        message: `Return request received for order ${orderId}.`,
      };
    } catch (err) {
      const message =
        err instanceof ApiRequestError ? err.message : "Unknown error";
      return { error: message };
    }
  },
});