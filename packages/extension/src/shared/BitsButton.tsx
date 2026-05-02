import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

interface BitsButtonProps {
  channelId: string;
  sku: string;
  label: string;
  icon?: string;
  className?: string;
  onSuccess?: (action: string) => void;
}

export function BitsButton({ channelId, sku, label, icon = '⚡', className, onSuccess }: BitsButtonProps) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Twitch === 'undefined' || !Twitch.ext?.bits) return;
    Twitch.ext.bits.getProducts()
      .then((products) => setAvailable(products.some((p) => p.sku === sku)))
      .catch(() => {});
  }, [sku]);

  const handleComplete = useCallback(async (receipt: BitsTransactionReceipt) => {
    try {
      const res = await fetch(`${API_BASE}/bits/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionReceipt: receipt.transactionReceipt, channelId }),
      });
      if (res.ok) {
        const data = await res.json() as { action: string };
        onSuccess?.(data.action);
      }
    } catch {
      // silent — bits already charged by Twitch
    } finally {
      setLoading(false);
    }
  }, [channelId, onSuccess]);

  const handleClick = useCallback(() => {
    if (typeof Twitch === 'undefined' || !Twitch.ext?.bits || loading) return;
    setLoading(true);
    Twitch.ext.bits.onTransactionComplete(handleComplete);
    Twitch.ext.bits.onTransactionCancelled(() => setLoading(false));
    Twitch.ext.bits.useBits(sku);
  }, [sku, loading, handleComplete]);

  return (
    <button
      className={className ?? 'bits-btn'}
      onClick={handleClick}
      disabled={loading || !available}
      style={!available ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
    >
      <span className="bits-btn__icon">{icon}</span>
      <span className="bits-btn__label">{loading ? 'Processing...' : label}</span>
    </button>
  );
}
