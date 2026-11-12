// Nexora Fase 04 — Unified sales actions re-export
// Pages import from this file; actual implementations live in order-actions.ts, quote-actions.ts, and channel-actions.ts

export {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrderStatusHistory,
} from "./order-actions";

export {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  convertQuoteToOrder,
  getSalesStats,
  getQuoteStats,
} from "./quote-actions";

export {
  getSalesChannels,
  createChannel,
  updateChannel,
  deleteChannel,
} from "./channel-actions";