// Type declarations for the Twitch Extension Helper v1
// Loaded via CDN in each HTML entry point

interface TwitchExtAuth {
  clientId: string;
  helperVersion: string;
  token: string;       // signed JWT — send this to your backend as Bearer token
  userId: string;      // opaque user ID
}

interface TwitchExtContext {
  arePlayerControlsVisible: boolean;
  bitrate: number;
  bufferSize: number;
  displayResolution: string;
  game: string;
  hlsLatencyBroadcaster: number;
  isFullScreen: boolean;
  isMuted: boolean;
  isPaused: boolean;
  isTheatreMode: boolean;
  language: string;
  mode: 'viewer' | 'dashboard' | 'config';
  playbackMode: 'video' | 'audio' | 'remote' | 'chat-only';
  theme: 'light' | 'dark';
  videoResolution: string;
  volume: number;
}

interface BitsProduct {
  sku: string;
  cost: { amount: number; type: 'bits' };
  displayName: string;
  inDevelopment?: boolean;
}

interface BitsTransactionReceipt {
  transactionId: string;
  product: BitsProduct;
  userId: string;
  displayName: string;
  initiator: 'current_user' | 'other';
  transactionReceipt: string; // signed JWT — send to backend for verification
  timestamp: string;
}

interface TwitchExt {
  onAuthorized(callback: (auth: TwitchExtAuth) => void): void;
  onContext(callback: (ctx: Partial<TwitchExtContext>, changed: string[]) => void): void;
  onError(callback: (err: unknown) => void): void;
  onVisibilityChanged(callback: (isVisible: boolean, ctx: Partial<TwitchExtContext>) => void): void;
  viewer: {
    opaqueId: string;
    id: string | null;
    role: string;
    sessionToken: string;
    onChanged(callback: () => void): void;
  };
  configuration: {
    broadcaster: { version: string; content: string } | undefined;
    onChanged(callback: () => void): void;
    set(segment: 'broadcaster' | 'developer' | 'global', version: string, content: string): void;
  };
  actions: {
    requestIdShare(): void;
    onFollow(callback: (didFollow: boolean, domain: string) => void): void;
  };
  bits: {
    getProducts(): Promise<BitsProduct[]>;
    useBits(sku: string): void;
    onTransactionComplete(callback: (receipt: BitsTransactionReceipt) => void): void;
    onTransactionCancelled(callback: () => void): void;
    showBitsBalance(): void;
    setUseLoopback(useLoopback: boolean): void;
  };
}

declare const Twitch: { ext: TwitchExt };
