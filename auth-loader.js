const ROOM_INVENTORY_SUPABASE_URL = "https://uliflnwuorjuldlcibnp.supabase.co";
const ROOM_INVENTORY_SUPABASE_KEY = "sb_publishable_am2Py8DVUyPT32JwoBLTVg_b9Q8OAZw";

(async function loadAuthenticatedApp() {
  const status = document.querySelector("#syncStatus");
  const setStatus = (text, mode = "neutral") => {
    if (!status) return;
    status.textContent = text;
    status.dataset.mode = mode;
  };

  if (!window.supabase) {
    setStatus("Supabase 未加载", "warn");
    return;
  }

  const client = window.supabase.createClient(
    ROOM_INVENTORY_SUPABASE_URL,
    ROOM_INVENTORY_SUPABASE_KEY,
  );

  const code = new URLSearchParams(window.location.search).get("code");
  if (code) {
    setStatus("正在完成登录...", "neutral");
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      setStatus(`登录失败：${error.message}`, "warn");
    } else {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  const script = document.createElement("script");
  script.src = "./auth-app.js?v=2";
  document.body.appendChild(script);
})();
