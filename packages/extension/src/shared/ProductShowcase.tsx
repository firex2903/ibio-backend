/**
 * ProductShowcase — shown in the viewer bio panel.
 * Displays active digital products and handles Bits purchase + download.
 */
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

interface Product {
  id: string;
  title: string;
  description: string;
  priceBits: number;
  priceSku: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl: string | null;
}

interface Props {
  channelId: string;
  token: string | null;
}

export function ProductShowcase({ channelId, token }: Props) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/creator/${channelId}/products`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setProducts(d.products))
      .catch(() => {});
  }, [channelId]);

  if (!products.length) return null;

  return (
    <div className="bio-section">
      <div className="bio-section__title">🛒 Productos</div>
      <div className="product-list">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} channelId={channelId} token={token} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product, channelId }: { product: Product; channelId: string; token: string | null }) {
  const [open, setOpen]       = useState(false);
  const [state, setState]     = useState<'idle' | 'buying' | 'done' | 'error'>('idle');
  const [dlToken, setDlToken] = useState<string | null>(null);

  const isImage = product.mimeType.startsWith('image/');

  const purchase = useCallback(async (testMode = false) => {
    if (state === 'buying') return;
    setState('buying');

    if (testMode) {
      try {
        const res = await fetch(`${API_BASE}/bits/product-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelId, productId: product.id, _test: true }),
        });
        if (res.ok) {
          const data = await res.json() as { downloadToken: string };
          setDlToken(data.downloadToken);
          setState('done');
        } else {
          setState('error');
        }
      } catch {
        setState('error');
      }
      return;
    }

    if (typeof Twitch === 'undefined' || !Twitch.ext?.bits) { setState('idle'); return; }
    const timeout = setTimeout(() => setState('idle'), 30000); // 30s fallback
    Twitch.ext.bits.onTransactionComplete(async (receipt) => {
      try {
        const res = await fetch(`${API_BASE}/bits/product-purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionReceipt: receipt.transactionReceipt,
            channelId,
            productId: product.id,
          }),
        });
        if (res.ok) {
          const data = await res.json() as { downloadToken: string };
          setDlToken(data.downloadToken);
          setState('done');
        } else {
          setState('error');
        }
      } catch {
        setState('error');
      }
    });
    Twitch.ext.bits.onTransactionCancelled(() => { clearTimeout(timeout); setState('idle'); });
    Twitch.ext.bits.useBits(product.priceSku);
  }, [product, channelId, state]);

  // Only treat as "inside Twitch" when NOT in Vite dev mode
  const isInsideTwitch = !import.meta.env.DEV && typeof Twitch !== 'undefined' && !!Twitch.ext?.bits;

  const fmt = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  const typeIcon = () => {
    if (product.mimeType.startsWith('image/'))       return '🖼️';
    if (product.mimeType.startsWith('video/'))       return '🎬';
    if (product.mimeType === 'application/pdf')      return '📄';
    if (product.mimeType === 'application/zip')      return '📦';
    return '📁';
  };

  const downloadUrl = dlToken ? `${API_BASE}/download/${dlToken}` : null;

  return (
    <>
      {/* ── Card row ── */}
      <div className="product-card" onClick={() => setOpen(true)} style={{ cursor: 'pointer' }}>
        <div className="product-card__thumb">
          {isImage
            ? <img src={product.previewUrl ?? 'https://pub-f91cc9f45749455283cf99aeff6d472e.r2.dev/overlays/60691070-271b93be-866f-473a-967b-6aee8321bbb6.webp'} alt={product.title} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span style={{ fontSize: 24 }}>{typeIcon()}</span>
          }
        </div>
        <div className="product-card__info">
          <div className="product-card__title">{product.title}</div>
          {product.description && <div className="product-card__desc">{product.description}</div>}
        </div>
        <div className="product-card__price">💜 {product.priceBits}</div>
      </div>

      {/* ── Preview modal ── */}
      {open && (
        <div className="product-modal" onClick={() => setOpen(false)}>
          <div className="product-modal__box" onClick={(e) => e.stopPropagation()}>
            <button className="product-modal__close" onClick={() => setOpen(false)}>✕</button>

            {/* Preview area */}
            <div className="product-modal__preview">
              {isImage ? (
                <img src={product.previewUrl ?? 'https://pub-f91cc9f45749455283cf99aeff6d472e.r2.dev/overlays/60691070-271b93be-866f-473a-967b-6aee8321bbb6.webp'} alt={product.title} />
              ) : (
                <div className="product-modal__file-icon">
                  <span>{typeIcon()}</span>
                  <span style={{ fontSize: 13, marginTop: 8, color: '#ccc' }}>{product.fileName}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="product-modal__info">
              <div className="product-modal__title">{product.title}</div>
              {product.description && <div className="product-modal__desc">{product.description}</div>}
              <div className="product-modal__meta">{fmt(product.fileSize)} · {typeIcon()} {product.mimeType.split('/')[1]?.toUpperCase()}</div>
            </div>

            {/* Action */}
            {state === 'done' && downloadUrl ? (
              <a className="bits-btn bits-btn--donate" href={downloadUrl} target="_blank" rel="noreferrer" style={{ marginTop: 12, justifyContent: 'center' }}>
                ⬇ Descargar ahora
              </a>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '12px 16px 16px' }}>
                <button
                  className="bits-btn bits-btn--donate"
                  onClick={() => purchase(false)}
                  disabled={state === 'buying' || !isInsideTwitch}
                  style={{ margin: 0, width: '100%', opacity: isInsideTwitch ? 1 : 0.4, ...(state === 'error' ? { background: '#c0392b' } : {}) }}
                >
                  <span className="bits-btn__icon">💜</span>
                  <span className="bits-btn__label">
                    {state === 'buying' ? 'Procesando...' : state === 'error' ? 'Error — reintentar' : `Comprar · ${product.priceBits} Bits`}
                  </span>
                </button>
                {!isInsideTwitch && (
                  <button
                    className="bits-btn"
                    onClick={() => purchase(true)}
                    disabled={state === 'buying'}
                    style={{ margin: 0, width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.25)', color: '#aaa', fontSize: 12 }}
                  >
                    <span className="bits-btn__icon">🧪</span>
                    <span className="bits-btn__label">Compra de prueba (dev)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
