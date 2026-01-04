/**
 * Shopify Integration Page - AI-powered product description generator
 */

import React, { useState, useEffect } from "react";
import { shopify } from "../lib/api";
import { useToast } from "../contexts/ToastContext";

interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  status: string;
  image?: string;
  price?: string;
}

interface ShopInfo {
  name: string;
  email: string;
  myshopifyDomain: string;
  plan: { displayName: string };
  primaryDomain: { url: string };
}

export function ShopifyPage() {
  const { showToast } = useToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  
  // Generation options
  const [tone, setTone] = useState("professional");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const session = await shopify.getSession();
      setAuthenticated(session.authenticated);
      if (session.authenticated) {
        await loadShopData();
      }
    } catch (error) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadShopData = async () => {
    try {
      const [shopData, productsData] = await Promise.all([
        shopify.getShop(),
        shopify.getProducts(),
      ]);
      setShop(shopData.shop);
      setProducts(productsData.products);
    } catch (error) {
      showToast("error", "Failed to load shop data");
    }
  };


  const handleConnect = () => {
    if (!shopDomain) {
      showToast("error", "Please enter your shop domain");
      return;
    }
    const domain = shopDomain.includes(".myshopify.com") 
      ? shopDomain 
      : `${shopDomain}.myshopify.com`;
    window.location.href = shopify.getAuthUrl(domain);
  };

  const handleGenerateDescription = async () => {
    if (!selectedProduct) return;
    
    setGenerating(true);
    try {
      const result = await shopify.generateDescription(selectedProduct.id, {
        tone,
        keywords,
      });
      setGeneratedDescription(result.generatedDescription);
      showToast("success", "Description generated!");
    } catch (error) {
      showToast("error", "Failed to generate description");
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyDescription = async () => {
    if (!selectedProduct || !generatedDescription) return;
    
    try {
      await shopify.updateDescription(selectedProduct.id, generatedDescription);
      showToast("success", "Description updated in Shopify!");
      
      // Update local state
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, description: generatedDescription }
          : p
      ));
      setSelectedProduct({ ...selectedProduct, description: generatedDescription });
    } catch (error) {
      showToast("error", "Failed to update description");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading Shopify integration...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="shopify-connect">
        <div className="connect-card">
          <div className="shopify-logo">
            <svg viewBox="0 0 109 124" fill="currentColor">
              <path d="M74.7 14.8c-.1-.1-.2-.1-.3-.1-.1 0-2.8-.2-2.8-.2s-1.9-1.8-2.1-2c-.2-.2-.6-.1-.8-.1 0 0-.4.1-1.1.3-.7-1.9-1.8-3.7-3.8-3.7h-.2c-1.1-1.5-2.5-2.1-3.7-2.1-9.2 0-13.6 11.5-15 17.3-3.6 1.1-6.2 1.9-6.5 2-.2.1-2 .6-2.1.6-.1 0-.1.1-.1.2-.1.1-5.3 36.4-5.3 36.4l39.8 7.5 21.6-4.7S74.8 14.9 74.7 14.8z"/>
            </svg>
          </div>
          <h2>Connect Your Shopify Store</h2>
          <p>Generate AI-powered product descriptions for your entire catalog</p>
          
          <div className="connect-form">
            <label className="label">Your Shopify Store Domain</label>
            <input
              type="text"
              className="input"
              placeholder="your-store.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
            <button className="btn btn-primary btn-lg" onClick={handleConnect}>
              Connect to Shopify
            </button>
          </div>
          
          <div className="features-list">
            <div className="feature">
              <span className="feature-icon">✨</span>
              <span>AI-generated product descriptions</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🎯</span>
              <span>Customizable tone and keywords</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span>One-click apply to Shopify</span>
            </div>
          </div>
        </div>
        
        <style>{`
          .shopify-connect {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: calc(100vh - 200px);
          }
          .connect-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 1rem;
            padding: 3rem;
            max-width: 480px;
            text-align: center;
          }
          .shopify-logo {
            width: 64px;
            height: 64px;
            margin: 0 auto 1.5rem;
            color: #96bf48;
          }
          .shopify-logo svg {
            width: 100%;
            height: 100%;
          }
          .connect-card h2 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .connect-card p {
            color: var(--text-muted);
            margin-bottom: 2rem;
          }
          .connect-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .connect-form .label {
            text-align: left;
          }
          .features-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            text-align: left;
          }
          .feature {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-muted);
          }
          .feature-icon {
            font-size: 1.25rem;
          }
        `}</style>
      </div>
    );
  }


  return (
    <div className="shopify-page">
      {/* Shop Header */}
      {shop && (
        <div className="shop-header card">
          <div className="shop-info">
            <h2>{shop.name}</h2>
            <p>{shop.myshopifyDomain}</p>
          </div>
          <span className="badge badge-success">Connected</span>
        </div>
      )}

      <div className="shopify-layout">
        {/* Products List */}
        <div className="products-panel card">
          <div className="card-header">
            <h3 className="card-title">Products ({products.length})</h3>
          </div>
          <div className="products-list">
            {products.map((product) => (
              <button
                key={product.id}
                className={`product-item ${selectedProduct?.id === product.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedProduct(product);
                  setGeneratedDescription("");
                }}
              >
                {product.image && (
                  <img src={product.image} alt={product.title} className="product-thumb" />
                )}
                <div className="product-info">
                  <div className="product-title">{product.title}</div>
                  <div className="product-price">{product.price ? `$${product.price}` : "No price"}</div>
                </div>
                <span className={`badge badge-${product.status === "ACTIVE" ? "success" : "neutral"}`}>
                  {product.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Description Generator */}
        <div className="generator-panel card">
          {selectedProduct ? (
            <>
              <div className="card-header">
                <h3 className="card-title">{selectedProduct.title}</h3>
              </div>
              
              <div className="description-section">
                <label className="label">Current Description</label>
                <div className="current-description">
                  {selectedProduct.description || <em>No description</em>}
                </div>
              </div>

              <div className="generation-options">
                <div className="option-group">
                  <label className="label">Tone</label>
                  <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="luxury">Luxury & Premium</option>
                    <option value="playful">Playful & Fun</option>
                    <option value="technical">Technical & Detailed</option>
                  </select>
                </div>
                <div className="option-group">
                  <label className="label">Keywords (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="quality, sustainable, handmade..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateDescription}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    Generating...
                  </>
                ) : (
                  "✨ Generate AI Description"
                )}
              </button>

              {generatedDescription && (
                <div className="generated-section">
                  <label className="label">Generated Description</label>
                  <textarea
                    className="input textarea"
                    value={generatedDescription}
                    onChange={(e) => setGeneratedDescription(e.target.value)}
                    rows={6}
                  />
                  <button className="btn btn-primary" onClick={handleApplyDescription}>
                    Apply to Shopify
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Select a product to generate an AI description</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .shopify-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .shop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .shop-info h2 {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .shop-info p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .shopify-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1.5rem;
        }
        .products-panel {
          max-height: calc(100vh - 280px);
          display: flex;
          flex-direction: column;
        }
        .products-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .product-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: var(--bg-dark);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .product-item:hover {
          border-color: var(--primary);
        }
        .product-item.selected {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .product-thumb {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 0.375rem;
        }
        .product-info {
          flex: 1;
          min-width: 0;
        }
        .product-title {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .product-price {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .generator-panel {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .description-section .current-description {
          background: var(--bg-dark);
          padding: 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
          max-height: 120px;
          overflow-y: auto;
        }
        .generation-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .generated-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .shopify-layout {
            grid-template-columns: 1fr;
          }
          .generation-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
