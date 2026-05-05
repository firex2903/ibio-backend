import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useCreatorProfileFull } from '../hooks/useCreatorProfile';
import type {
  ModuleKind,
  CompanionModuleDTO,
} from '@creator-bio-hub/types';
import {
  PRO_ONLY_KINDS,
  STARTER_MODULE_LIMIT,
  DISPLAY_GROUP,
  DISPLAY_GROUP_LABEL as GROUP_LABEL,
} from '@creator-bio-hub/types';
// VISIBLE_KINDS used for add-module buttons (only CHANNEL_LINK shown)
import { API_BASE } from '../config';

// ─── Module kind metadata ─────────────────────────────────────────────────────

const MODULE_LABELS: Record<ModuleKind, string> = {
  CHANNEL_LINK:    'Creator Channel',
  COMMUNITY_SPACE: 'Community Space',
  STREAM_SCHEDULE: 'Stream Schedule',
  PARTNER_CARD:    'Partner Card',
  VIEWER_PERK:     'Viewer Perk',
  SUPPORT_OPTION:  'Support Option',
  MERCH_SHOWCASE:  'Merch Showcase',
  CHANNEL_EVENT:   'Channel Event',
  QUICK_ACTION:    'Quick Action',
};

// Only these kinds shown in the simplified config
const VISIBLE_KINDS: ModuleKind[] = ['CHANNEL_LINK'];

// Default empty configs per kind
function defaultConfig(kind: ModuleKind): Record<string, unknown> {
  switch (kind) {
    case 'CHANNEL_LINK':    return { platform: 'youtube', url: '' };
    case 'COMMUNITY_SPACE': return { platform: 'discord', url: '' };
    case 'STREAM_SCHEDULE': return { entries: [] };
    case 'PARTNER_CARD':    return { url: '' };
    case 'VIEWER_PERK':     return { perkCode: '', perkDescription: '', partnerName: '' };
    case 'SUPPORT_OPTION':  return { platform: 'ko-fi', url: '' };
    case 'MERCH_SHOWCASE':  return { url: '' };
    case 'CHANNEL_EVENT':   return {};
    case 'QUICK_ACTION':    return { url: '' };
  }
}

// ─── Draft module type ────────────────────────────────────────────────────────

type DraftModule = Omit<CompanionModuleDTO, 'id' | 'createdAt' | 'updatedAt'> & {
  _tempId: string;
  id?: string;
};

function newDraft(kind: ModuleKind, position: number): DraftModule {
  return {
    _tempId: crypto.randomUUID(),
    moduleKind: kind,
    title: '',
    position,
    visible: true,
    config: defaultConfig(kind),
  };
}

// ─── ConfigPanel ─────────────────────────────────────────────────────────────

export function ConfigPanel() {
  const { auth } = useTwitchAuth();
  const { profile, loading, refetch } = useCreatorProfileFull(auth?.channelId, auth?.token);

  // Identity fields
  const [displayName, setDisplayName]   = useState('');
  const [channelBio, setChannelBio]     = useState('');
  const [avatarUrl, setAvatarUrl]       = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimary]      = useState('#9147FF');
  const [secondaryColor, setSecondary]  = useState('#1a0a2e');
  const [accentColor, setAccent]        = useState('#9147FF');
  // Overlay settings
  const [overlayPosition, setOverlayPosition]     = useState<'left' | 'right'>('left');
  const [overlayBgColor, setOverlayBgColor]       = useState('');
  const [overlayBgImageUrl, setOverlayBgImageUrl] = useState('');
  const [overlayBgUploading, setOverlayBgUploading] = useState(false);
  const overlayBgFileRef = useRef<HTMLInputElement>(null);

  // Featured banner
  const [featuredBannerUrl, setFeaturedBannerUrl]         = useState('');
  const [featuredBannerImageUrl, setFeaturedBannerImageUrl] = useState('');
  const [featuredBannerLabel, setFeaturedBannerLabel]     = useState('');
  const [bannerUploading, setBannerUploading]             = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Modules
  const [modules, setModules] = useState<DraftModule[]>([]);
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setChannelBio(profile.channelBio ?? '');
    setAvatarUrl(profile.avatarUrl ?? '');
    setPrimary(profile.brandAssets.primaryColor);
    setSecondary(profile.brandAssets.secondaryColor);
    setAccent(profile.brandAssets.accentColor);
    setOverlayPosition((profile.brandAssets.overlayPosition as 'left' | 'right') ?? 'left');
    setOverlayBgColor(profile.brandAssets.overlayBgColor ?? '');
    setOverlayBgImageUrl(profile.brandAssets.overlayBgImageUrl ?? '');
    setFeaturedBannerUrl(profile.brandAssets.featuredBannerUrl ?? '');
    setFeaturedBannerImageUrl(profile.brandAssets.featuredBannerImageUrl ?? '');
    setFeaturedBannerLabel(profile.brandAssets.featuredBannerLabel ?? '');
    setModules(
      profile.modules.map((m) => ({ ...m, _tempId: m.id }))
    );
  }, [profile]);

  const isPro   = profile?.plan === 'PRO';
  const atLimit = !isPro && modules.length >= STARTER_MODULE_LIMIT;

  const uploadOverlayBg = async (file: File) => {
    if (!auth) return;
    setOverlayBgUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/creator/${auth.channelId}/overlay-bg`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json() as { fileKey: string; url?: string };
        setOverlayBgImageUrl(data.url ?? `${API_BASE}/overlay-bgs/${data.fileKey}`);
      }
    } finally {
      setOverlayBgUploading(false);
      if (overlayBgFileRef.current) overlayBgFileRef.current.value = '';
    }
  };

  const uploadBannerBg = async (file: File) => {
    if (!auth) return;
    setBannerUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/creator/${auth.channelId}/featured-banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json() as { fileKey: string; url?: string };
        setFeaturedBannerImageUrl(data.url ?? `${API_BASE}/banners/${data.fileKey}`);
      }
    } finally {
      setBannerUploading(false);
      if (bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!auth) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/creator/${auth.channelId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json() as { fileKey: string; url?: string };
        setAvatarUrl(data.url ?? `${API_BASE}/avatars/${data.fileKey}`);
      }
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  const addModule = (kind: ModuleKind) => {
    if (atLimit) return;
    if (!isPro && PRO_ONLY_KINDS.has(kind)) return;
    setModules((prev) => [...prev, newDraft(kind, prev.length)]);
  };

  const removeModule = (tempId: string) =>
    setModules((prev) => prev.filter((m) => m._tempId !== tempId));

  const updateModule = (tempId: string, patch: Partial<DraftModule>) =>
    setModules((prev) => prev.map((m) => (m._tempId === tempId ? { ...m, ...patch } : m)));

  const updateConfig = (tempId: string, key: string, value: unknown) =>
    setModules((prev) =>
      prev.map((m) =>
        m._tempId === tempId
          ? { ...m, config: { ...(m.config as Record<string, unknown>), [key]: value } }
          : m
      )
    );

  const save = async () => {
    if (!auth) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // 1. Save profile identity + brand assets
      const profileRes = await fetch(`${API_BASE}/creator/${auth.channelId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          displayName, channelBio, avatarUrl,
          brandAssets: { primaryColor, secondaryColor, accentColor, overlayPosition, overlayBgColor, overlayBgImageUrl, featuredBannerUrl, featuredBannerImageUrl, featuredBannerLabel },
        }),
      });
      if (!profileRes.ok) throw new Error(await profileRes.text());

      // 2. Sync modules: delete removed, update existing, create new
      const originalIds = new Set((profile?.modules ?? []).map((m) => m.id));
      const draftIds    = new Set(modules.filter((m) => m.id).map((m) => m.id!));

      // Delete modules removed from draft
      const deletions = [...originalIds].filter((id) => !draftIds.has(id));
      await Promise.all(
        deletions.map((id) =>
          fetch(`${API_BASE}/creator/${auth.channelId}/modules/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${auth.token}` },
          })
        )
      );

      // Upsert modules in order — must be sequential to respect plan limits
      const savedIds: string[] = [];
      for (const [i, m] of modules.entries()) {
        const body = JSON.stringify({
          moduleKind: m.moduleKind,
          title: m.title || m.moduleKind,
          visible: m.visible,
          position: i,
          config: m.config,
        });
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` };

        if (m.id) {
          // Update existing
          const res = await fetch(`${API_BASE}/creator/${auth.channelId}/modules/${m.id}`, {
            method: 'PUT', headers, body,
          });
          if (res.ok) savedIds.push(m.id);
        } else {
          // Create new
          const res = await fetch(`${API_BASE}/creator/${auth.channelId}/modules`, {
            method: 'POST', headers, body,
          });
          if (res.ok) {
            const data = await res.json() as { module: { id: string } };
            savedIds.push(data.module.id);
          }
        }
      }

      // 3. Reorder if we have saved IDs
      if (savedIds.length > 0) {
        await fetch(`${API_BASE}/creator/${auth.channelId}/modules/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ order: savedIds }),
        });
      }

      setSaveMsg({ text: '✓ Saved', ok: true });
      refetch();
    } catch {
      setSaveMsg({ text: 'Save failed — please try again', ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (!auth) {
    return <div className="config"><p style={{ color: 'var(--text-muted)', padding: '20px' }}>Waiting for Twitch authorization...</p></div>;
  }

  if (loading) {
    return <div className="config"><p style={{ color: 'var(--text-muted)' }}>Loading companion setup...</p></div>;
  }

  return (
    <div className="config">

      {/* ── Header ── */}
      <div className="config-header">
        <h1>Creator Companion Setup</h1>
        <span className={`badge badge--${isPro ? 'pro' : 'free'}`}>
          {isPro ? '✦ Creator Pro' : 'Starter'}
        </span>
      </div>

      {/* ── Channel Identity ── */}
      <div className="card">
        <div className="card-title">Channel Identity</div>

        <div className="field-row">
          <div className="field">
            <label>Channel Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your channel name" maxLength={64} />
          </div>
          <div className="field">
            <label>Avatar</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ flex: 1 }} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://i.ibb.co/... (direct image link)" />
              <AvatarPreview url={avatarUrl} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ flex: 1, fontSize: 11 }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
              />
              {avatarUploading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Subiendo...</span>}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Channel Bio</label>
          <textarea
            value={channelBio}
            onChange={(e) => setChannelBio(e.target.value)}
            placeholder="Short description shown to viewers in your companion panel..."
            rows={2}
            maxLength={200}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Banner Color</label>
            <input type="color" value={primaryColor} onChange={(e) => setPrimary(e.target.value)} />
          </div>
          <div className="field">
            <label>Banner Shadow</label>
            <input type="color" value={secondaryColor} onChange={(e) => setSecondary(e.target.value)} />
          </div>
          <div className={`field ${!isPro ? 'pro-field' : ''}`}>
            {!isPro && <span className="pro-badge">Pro</span>}
            <label>Accent Color</label>
            <input type="color" value={accentColor} onChange={(e) => setAccent(e.target.value)} disabled={!isPro} />
          </div>
        </div>
      </div>

      {/* ── Overlay Button ── */}
      <div className="card">
        <div className="card-title">🎛️ Overlay Button</div>
        <div className="field-row">
          <div className="field">
            <label>Position</label>
            <select value={overlayPosition} onChange={(e) => setOverlayPosition(e.target.value as 'left' | 'right')}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="field">
            <label>Background Color</label>
            <input type="color" value={overlayBgColor || '#080810'} onChange={(e) => setOverlayBgColor(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Background Image (subir archivo)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={overlayBgFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ flex: 1, fontSize: 11 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOverlayBg(f); }}
            />
            {overlayBgUploading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Subiendo...</span>}
          </div>
          {overlayBgImageUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <img src={overlayBgImageUrl} style={{ height: 32, borderRadius: 4, objectFit: 'cover' }} alt="bg preview" />
              <button className="btn btn--danger btn--sm" onClick={() => setOverlayBgImageUrl('')}>✕</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Featured Banner ── */}
      <div className="card">
        <div className="card-title">⭐ Banner Destacado</div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
          Aparece arriba de Donaciones. Usa una imagen de tu red social favorita como fondo.
        </p>
        <div className="field">
          <label>URL de destino (red social a destacar)</label>
          <input
            value={featuredBannerUrl}
            onChange={(e) => setFeaturedBannerUrl(e.target.value)}
            placeholder="https://www.instagram.com/..."
          />
        </div>
        <div className="field">
          <label>Texto del banner</label>
          <input
            value={featuredBannerLabel}
            onChange={(e) => setFeaturedBannerLabel(e.target.value)}
            placeholder="¡Sígueme en Instagram!"
            maxLength={80}
          />
        </div>
        <div className="field">
          <label>Imagen de fondo (banner)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={bannerFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ flex: 1, fontSize: 11 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBannerBg(f); }}
            />
            {bannerUploading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Subiendo...</span>}
          </div>
          {featuredBannerImageUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <img src={featuredBannerImageUrl} style={{ height: 48, width: '100%', borderRadius: 8, objectFit: 'cover' }} alt="banner preview" />
              <button className="btn btn--danger btn--sm" onClick={() => setFeaturedBannerImageUrl('')}>✕</button>
            </div>
          )}
        </div>
        {!featuredBannerUrl && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>⚠ El banner se oculta si no hay URL de destino.</p>
        )}
      </div>

      {/* ── Redes Sociales ── */}
      <div className="card">
        <div className="card-title">🔗 Redes Sociales</div>

        <div className="link-list">
          {modules.filter(m => m.moduleKind === 'CHANNEL_LINK').map((m) => (
            <ModuleEditor
              key={m._tempId}
              draft={m}
              isPro={isPro}
              onUpdate={(patch) => updateModule(m._tempId, patch)}
              onConfigUpdate={(key, val) => updateConfig(m._tempId, key, val)}
              onRemove={() => removeModule(m._tempId)}
            />
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => addModule('CHANNEL_LINK')}
            disabled={atLimit}
          >
            + Agregar red social
          </button>
        </div>
      </div>

      {/* ── Digital Products ── */}
      <ProductManager auth={auth} />

      {/* ── Save ── */}
      <div className="btn-row">
        {saveMsg && (
          <span className={`save-status${saveMsg.ok ? '' : ' save-status--error'}`}>{saveMsg.text}</span>
        )}
        <button className="btn btn--primary" onClick={save} disabled={saving || !auth}>
          {saving ? 'Saving...' : 'Save Companion'}
        </button>
      </div>

    </div>
  );
}

// ─── BitsUpgradeButton ────────────────────────────────────────────────────────

function BitsUpgradeButton({ channelId, token, onUpgraded }: { channelId: string; token: string; onUpgraded: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (typeof Twitch === 'undefined' || !Twitch.ext?.bits || loading) return;
    setLoading(true);
    Twitch.ext.bits.onTransactionComplete(async (receipt) => {
      try {
        const res = await fetch(`${API_BASE}/bits/transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ transactionReceipt: receipt.transactionReceipt, channelId }),
        });
        if (res.ok) {
          const data = await res.json() as { action: string };
          if (data.action === 'upgraded') onUpgraded();
        }
      } finally {
        setLoading(false);
      }
    });
    Twitch.ext.bits.onTransactionCancelled(() => setLoading(false));
    Twitch.ext.bits.useBits('001S');
  };

  return (
    <button className="btn btn--primary" onClick={handleClick} disabled={loading}>
      <span>✦</span> {loading ? 'Procesando...' : 'Upgrade — 1000 Bits'}
    </button>
  );
}

// ─── ProductManager ───────────────────────────────────────────────────────────

interface DigitalProduct {
  id: string; title: string; description: string;
  priceBits: number; priceSku: string;
  fileName: string; mimeType: string; fileSize: number;
  _count: { purchases: number };
}

const PRICE_OPTIONS = [
  { bits: 300,  sku: '002X', label: '300 Bits' },
  { bits: 500,  sku: '001X', label: '500 Bits' },
  { bits: 1000, sku: '003X', label: '1000 Bits' },
];

function ProductManager({ auth }: { auth: { channelId: string; token: string } }) {
  const [products, setProducts]   = useState<DigitalProduct[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);

  // Form state
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [price, setPrice]       = useState(500);
  const [file, setFile]         = useState<File | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    const res = await fetch(`${API_BASE}/creator/${auth.channelId}/products`);
    if (res.ok) {
      const data = await res.json() as { products: DigitalProduct[] };
      setProducts(data.products);
    }
  }, [auth.channelId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const upload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim());
      fd.append('description', desc.trim());
      fd.append('priceBits', String(price));

      const res = await fetch(`${API_BASE}/creator/${auth.channelId}/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json() as { error: string };
        throw new Error(e.error);
      }
      setMsg({ text: '✓ Producto subido', ok: true });
      setTitle(''); setDesc(''); setFile(null); setPrice(500);
      if (fileRef.current) fileRef.current.value = '';
      await fetchProducts();
    } catch (e: unknown) {
      setMsg({ text: (e as Error).message ?? 'Error al subir', ok: false });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`${API_BASE}/creator/${auth.channelId}/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    await fetchProducts();
  };

  const fmt = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="card">
      <div className="card-title">🛒 Productos Digitales</div>

      {/* Existing products */}
      {products.length > 0 && (
        <div className="link-list" style={{ marginBottom: 12 }}>
          {products.map((p) => (
            <div key={p.id} className="module-editor">
              <div className="module-editor__head">
                <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{p.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {p.priceBits} bits · {p._count.purchases} ventas · {fmt(p.fileSize)}
                </span>
                <button className="btn btn--danger btn--sm" onClick={() => remove(p.id)}>✕</button>
              </div>
              {p.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{p.description}</div>
              )}
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>📁 {p.fileName}</div>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="field-row">
          <div className="field" style={{ flex: 2 }}>
            <label>Título del producto</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wallpaper pack, Foto exclusiva..." maxLength={64} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Precio</label>
            <select value={price} onChange={(e) => setPrice(Number(e.target.value))}>
              {PRICE_OPTIONS.map((o) => (
                <option key={o.bits} value={o.bits}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Descripción (opcional)</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Pack de 10 wallpapers 4K..." maxLength={120} />
        </div>
        <div className="field">
          <label>Archivo (imagen, video, PDF, ZIP — máx 100 MB)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm,application/pdf,application/zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{file.name} ({fmt(file.size)})</span>}
        </div>
        {msg && (
          <span style={{ fontSize: 12, color: msg.ok ? '#4caf50' : '#f44' }}>{msg.text}</span>
        )}
        <button
          className="btn btn--primary btn--sm"
          onClick={upload}
          disabled={uploading || !file || !title.trim()}
          style={{ alignSelf: 'flex-start' }}
        >
          {uploading ? 'Subiendo...' : '↑ Subir producto'}
        </button>
      </div>
    </div>
  );
}

// ─── AvatarPreview ────────────────────────────────────────────────────────────

function AvatarPreview({ url }: { url: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const prev = useRef('');

  useEffect(() => {
    if (!url || url === prev.current) return;
    prev.current = url;
    setStatus('idle');
    const img = new Image();
    img.onload  = () => setStatus('ok');
    img.onerror = () => setStatus('error');
    img.src = url;
  }, [url]);

  if (!url) return null;

  const style: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
    border: `2px solid ${status === 'ok' ? '#4caf50' : status === 'error' ? '#f44' : '#555'}`,
  };

  if (status === 'ok') return <img src={url} style={style} alt="preview" />;
  if (status === 'error') return (
    <div style={{ ...style, background: '#2a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }} title="Image failed to load — use a direct image URL">❌</div>
  );
  return <div style={{ ...style, background: '#222' }} />;
}

// ─── ModuleEditor ─────────────────────────────────────────────────────────────

interface EditorProps {
  draft: DraftModule;
  isPro: boolean;
  onUpdate: (patch: Partial<DraftModule>) => void;
  onConfigUpdate: (key: string, value: unknown) => void;
  onRemove: () => void;
}

function ModuleEditor({ draft, isPro, onUpdate, onConfigUpdate, onRemove }: EditorProps) {
  const cfg = draft.config as Record<string, unknown>;
  const group = DISPLAY_GROUP[draft.moduleKind];

  return (
    <div className="module-editor">
      {/* Header row */}
      <div className="module-editor__head">
        <span className="drag-handle" title="Drag to reorder">⠿</span>
        <span className="module-editor__kind">{MODULE_LABELS[draft.moduleKind]}</span>
        <span className="module-editor__group">{GROUP_LABEL[group]}</span>
        <label className="module-editor__visible" title="Show/hide this module">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={(e) => onUpdate({ visible: e.target.checked })}
          />
          Visible
        </label>
        <button className="btn btn--danger btn--sm" onClick={onRemove} title="Remove">✕</button>
      </div>

      {/* Title */}
      <div className="field" style={{ marginTop: 6 }}>
        <label>Title shown to viewers</label>
        <input
          value={draft.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Module display title"
          maxLength={64}
        />
      </div>

      {/* Kind-specific config fields */}
      <ModuleConfigFields kind={draft.moduleKind} cfg={cfg} isPro={isPro} onChange={onConfigUpdate} />
    </div>
  );
}

// ─── Kind-specific config fields ──────────────────────────────────────────────

const CHANNEL_LINK_PLATFORMS = ['youtube', 'twitter', 'instagram', 'tiktok', 'kick', 'twitch', 'facebook', 'github', 'patreon', 'ko-fi', 'website', 'custom'] as const;
const COMMUNITY_PLATFORMS    = ['discord', 'telegram', 'whatsapp', 'website', 'custom'] as const;
const SUPPORT_PLATFORMS      = ['ko-fi', 'streamlabs', 'patreon', 'paypal', 'website'] as const;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function field(label: string, input: ReactNode) {
  return (
    <div className="field" style={{ marginTop: 6 }}>
      <label>{label}</label>
      {input}
    </div>
  );
}

interface CfgProps {
  kind: ModuleKind;
  cfg: Record<string, unknown>;
  isPro: boolean;
  onChange: (key: string, val: unknown) => void;
}

function ModuleConfigFields({ kind, cfg, isPro, onChange }: CfgProps) {
  switch (kind) {

    case 'CHANNEL_LINK':
      return (
        <>
          {field('Platform', (
            <select value={String(cfg.platform ?? 'website')} onChange={(e) => onChange('platform', e.target.value)}>
              {CHANNEL_LINK_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {field('URL', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://..." />)}
          {field('Display label (optional)', <input value={String(cfg.displayLabel ?? '')} onChange={(e) => onChange('displayLabel', e.target.value)} placeholder="Override platform name" maxLength={32} />)}
        </>
      );

    case 'COMMUNITY_SPACE':
      return (
        <>
          {field('Platform', (
            <select value={String(cfg.platform ?? 'discord')} onChange={(e) => onChange('platform', e.target.value)}>
              {COMMUNITY_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {field('Invite / URL', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://discord.gg/..." />)}
          {field('Member count label (optional)', <input value={String(cfg.memberCount ?? '')} onChange={(e) => onChange('memberCount', e.target.value || undefined)} placeholder="e.g. 12.4k members" maxLength={32} />)}
        </>
      );

    case 'STREAM_SCHEDULE': {
      const entries = (cfg.entries as { day: string; time: string; label?: string }[]) ?? [];
      return (
        <div style={{ marginTop: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Schedule entries (e.g. "8 PM - 11 PM EST")</label>
          {entries.map((entry, i) => (
            <div key={i} className="field-row" style={{ marginTop: 4, gap: 4, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: '0 0 70px' }}>
                <select value={entry.day} onChange={(e) => {
                  const next = [...entries]; next[i] = { ...next[i], day: e.target.value };
                  onChange('entries', next);
                }}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}>
                <input
                  value={entry.time ?? ''}
                  placeholder="e.g. 8 PM – 11 PM EST"
                  onChange={(e) => {
                    const next = [...entries]; next[i] = { ...next[i], time: e.target.value };
                    onChange('entries', next);
                  }}
                  maxLength={32}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <input value={entry.label ?? ''} placeholder="Label (optional)" onChange={(e) => {
                  const next = [...entries]; next[i] = { ...next[i], label: e.target.value || undefined };
                  onChange('entries', next);
                }} maxLength={64} />
              </div>
              <button className="btn btn--danger btn--sm" onClick={() => onChange('entries', entries.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button
            className="btn btn--secondary btn--sm"
            style={{ marginTop: 4 }}
            onClick={() => onChange('entries', [...entries, { day: 'Mon', time: '' }])}
            disabled={entries.length >= 7}
          >
            + Add Day
          </button>
        </div>
      );
    }

    case 'PARTNER_CARD':
      return (
        <>
          {field('Partner URL', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://..." />)}
          {field('Banner image URL (optional)', <input value={String(cfg.imageUrl ?? '')} onChange={(e) => onChange('imageUrl', e.target.value)} placeholder="https://..." />)}
          {field('CTA button label', <input value={String(cfg.ctaLabel ?? '')} onChange={(e) => onChange('ctaLabel', e.target.value)} placeholder="Learn More" maxLength={32} />)}
          {field('Description (optional)', <input value={String(cfg.description ?? '')} onChange={(e) => onChange('description', e.target.value)} maxLength={120} />)}
          <div className={`field ${!isPro ? 'pro-field' : ''}`} style={{ marginTop: 6 }}>
            {!isPro && <span className="pro-badge">Pro</span>}
            <label>Viewer perk code (optional)</label>
            <input value={String(cfg.viewerPerkCode ?? '')} onChange={(e) => onChange('viewerPerkCode', e.target.value)} placeholder="e.g. STREAM15" maxLength={32} disabled={!isPro} />
          </div>
          <div className={`field ${!isPro ? 'pro-field' : ''}`} style={{ marginTop: 6 }}>
            {!isPro && <span className="pro-badge">Pro</span>}
            <label>Perk description</label>
            <input value={String(cfg.viewerPerkDescription ?? '')} onChange={(e) => onChange('viewerPerkDescription', e.target.value)} placeholder="e.g. 15% off for viewers" maxLength={80} disabled={!isPro} />
          </div>
        </>
      );

    case 'VIEWER_PERK':
      return (
        <>
          {field('Partner / brand name', <input value={String(cfg.partnerName ?? '')} onChange={(e) => onChange('partnerName', e.target.value)} placeholder="Acme Corp" maxLength={48} />)}
          {field('Perk code', <input value={String(cfg.perkCode ?? '')} onChange={(e) => onChange('perkCode', e.target.value)} placeholder="e.g. STREAM15" maxLength={32} />)}
          {field('Perk description', <input value={String(cfg.perkDescription ?? '')} onChange={(e) => onChange('perkDescription', e.target.value)} placeholder="e.g. 15% off for viewers" maxLength={120} />)}
          {field('Redemption URL (optional)', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://..." />)}
        </>
      );

    case 'SUPPORT_OPTION':
      return (
        <>
          {field('Platform', (
            <select value={String(cfg.platform ?? 'ko-fi')} onChange={(e) => onChange('platform', e.target.value)}>
              {SUPPORT_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ))}
          {field('URL', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://ko-fi.com/..." />)}
        </>
      );

    case 'MERCH_SHOWCASE':
      return (
        <>
          {field('Store URL', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://..." />)}
          {field('Product image URL (optional)', <input value={String(cfg.imageUrl ?? '')} onChange={(e) => onChange('imageUrl', e.target.value)} placeholder="https://..." />)}
          {field('Description (optional)', <input value={String(cfg.description ?? '')} onChange={(e) => onChange('description', e.target.value)} maxLength={120} />)}
        </>
      );

    case 'CHANNEL_EVENT':
      return (
        <>
          {field('Event URL (optional)', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://..." />)}
          {field('Event date/time (optional)', (
            <input
              type="datetime-local"
              value={cfg.eventDate ? new Date(String(cfg.eventDate)).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                if (e.target.value) {
                  onChange('eventDate', new Date(e.target.value).toISOString());
                } else {
                  onChange('eventDate', undefined);
                }
              }}
            />
          ))}
          {field('Description (optional)', <input value={String(cfg.description ?? '')} onChange={(e) => onChange('description', e.target.value)} maxLength={120} />)}
        </>
      );

    case 'QUICK_ACTION':
      return (
        <>
          {field('URL', <input value={String(cfg.url ?? '')} onChange={(e) => onChange('url', e.target.value)} placeholder="https://..." />)}
          {field('Icon (emoji)', <input value={String(cfg.icon ?? '')} onChange={(e) => onChange('icon', e.target.value)} placeholder="🎮" maxLength={4} />)}
          {field('Button color (optional)', <input type="color" value={String(cfg.color ?? '#9147FF')} onChange={(e) => onChange('color', e.target.value)} />)}
        </>
      );
  }
}
