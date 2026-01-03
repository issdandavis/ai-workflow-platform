# Shopify Integration - AI Collaborator Guide

> **For AI Assistants Working on This Codebase**

## 📁 Directory Purpose

Complete Shopify e-commerce integration for the platform. Enables selling products, managing orders, and syncing inventory.

## 🗂️ Files

### index.ts
Main router that combines all Shopify routes.

### auth.ts
OAuth flow for Shopify app installation.

**Flow:**
1. Merchant clicks "Install" in Shopify
2. Redirect to `/api/shopify/auth`
3. OAuth dance with Shopify
4. Store access token
5. Redirect to dashboard

### api.ts
Shopify Admin API client for:
- Products CRUD
- Orders management
- Inventory sync
- Customer data

### webhooks.ts
Webhook handlers for Shopify events:
- `orders/create`
- `orders/paid`
- `products/update`
- `app/uninstalled`

## 🔧 Configuration

Required environment variables:
```env
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_SCOPES=read_products,write_products,read_orders
```

## 🌍 Environment Handling

Shopify integration is optional:
```typescript
if (!process.env.SHOPIFY_API_KEY) {
  console.log('Shopify not configured, skipping routes');
  return router;
}
```

## ⚠️ Important Notes

- Webhooks must be verified with HMAC
- Access tokens are sensitive - encrypt in DB
- Rate limits: 2 req/sec for REST API
- Use GraphQL for bulk operations

---
*Last updated: v2.0.0 - January 2026*
