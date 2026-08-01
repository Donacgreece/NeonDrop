(() => {
  "use strict";

  const PROJECT_URL = "https://drlgvwhmfpdeupyhsoui.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_ljlZiPTf3z-_yk33SfRzPA_Z-4_ZgWi";
  const SESSION_KEY = "ndSupabaseSession";
  const PENDING_KEY = "ndPendingGlobalScore";
  const CACHE_KEY = "ndGlobalLeaderboard";
  const RESERVED_NAMES = new Set(["PLAYER", "ADMIN", "NEONDROP", "GOOGLE", "APPLE"]);

  const normalizeName = value => String(value || "").toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 12);
  const validGlobalName = value => {
    const name = normalizeName(value);
    return /^[A-Z][A-Z0-9_]{2,11}$/.test(name) && !RESERVED_NAMES.has(name);
  };

  const readJSON = (key, fallback = null) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  };

  const saveSession = session => {
    const value = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
      user_id: session.user?.id || session.user_id
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(value));
    return value;
  };

  const authRequest = async (path, body) => {
    const response = await fetch(`${PROJECT_URL}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Authentication failed");
    return data;
  };

  const ensureSession = async () => {
    let session = readJSON(SESSION_KEY);
    const now = Math.floor(Date.now() / 1000);
    if (session?.access_token && session.expires_at > now + 90) return session;
    if (session?.refresh_token) {
      try {
        session = saveSession(await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token }));
        return session;
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    return saveSession(await authRequest("signup", {}));
  };

  const rpc = async (name, body) => {
    const session = await ensureSession();
    const response = await fetch(`${PROJECT_URL}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(data?.message || data?.hint || "Leaderboard request failed");
      error.code = data?.code || "";
      throw error;
    }
    return data;
  };

  const platform = () => {
    const current = window.Capacitor?.getPlatform?.() || window.Capacitor?.platform;
    if (current === "android" || current === "ios") return current;
    return "web";
  };

  const cacheBoard = (filter, rows) => {
    const cache = readJSON(CACHE_KEY, {});
    cache[filter] = { rows, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  };

  const load = async (filter = "all") => {
    try {
      const rows = await rpc("get_neon_leaderboard", { p_platform: filter, p_limit: 10 });
      cacheBoard(filter, Array.isArray(rows) ? rows : []);
      return { rows: Array.isArray(rows) ? rows : [], offline: false };
    } catch (error) {
      const cached = readJSON(CACHE_KEY, {})[filter];
      if (cached) return { rows: cached.rows || [], offline: true };
      throw error;
    }
  };

  const submit = async ({ playerName, score, gates, bestCombo }) => {
    const normalizedName = normalizeName(playerName);
    if (!validGlobalName(normalizedName)) {
      localStorage.removeItem(PENDING_KEY);
      return { skipped: true, reason: "name_required" };
    }
    const payload = {
      p_player_name: normalizedName,
      p_score: Math.max(0, Math.floor(score || 0)),
      p_platform: platform(),
      p_gates: Math.max(0, Math.floor(gates || 0)),
      p_best_combo: Math.max(0, Math.floor(bestCombo || 0))
    };
    if (payload.p_score <= 0) return null;
    try {
      const result = await rpc("submit_neon_score", payload);
      localStorage.removeItem(PENDING_KEY);
      return result;
    } catch (error) {
      const previous = readJSON(PENDING_KEY);
      if (!previous || payload.p_score > previous.p_score) localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
      throw error;
    }
  };

  const flushPending = async () => {
    const pending = readJSON(PENDING_KEY);
    if (!pending) return;
    if (!validGlobalName(pending.p_player_name)) {
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    try {
      await rpc("submit_neon_score", pending);
      localStorage.removeItem(PENDING_KEY);
    } catch {}
  };

  const init = async () => {
    await ensureSession();
    await flushPending();
  };

  window.NeonGlobal = { init, load, submit, platform, validGlobalName };
})();
