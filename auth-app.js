const SUPABASE_URL = "https://uliflnwuorjuldlcibnp.supabase.co";
const SUPABASE_KEY = "sb_publishable_am2Py8DVUyPT32JwoBLTVg_b9Q8OAZw";
const STATES = ["保留", "待处理", "待送人", "待丢弃", "待维修"];
const cloud = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY) || null;
let user = null;
let containers = [];
let items = [];
let activeContainerId = "";

const $ = (id) => document.querySelector(id);
const el = {
  authPanel: $("#authPanel"), loginForm: $("#loginForm"), email: $("#emailInput"), logout: $("#logoutBtn"), sync: $("#syncStatus"),
  itemForm: $("#itemForm"), itemFormTitle: $("#itemFormTitle"), itemId: $("#itemId"), name: $("#nameInput"), category: $("#categoryInput"), itemContainer: $("#itemContainerSelect"), location: $("#locationInput"), state: $("#stateInput"), note: $("#noteInput"), saveItem: $("#saveItemBtn"), resetItem: $("#resetItemBtn"),
  containerForm: $("#containerForm"), containerFormTitle: $("#containerFormTitle"), containerId: $("#containerId"), containerName: $("#containerNameInput"), containerType: $("#containerTypeInput"), containerLocation: $("#containerLocationInput"), containerNote: $("#containerNoteInput"), saveContainer: $("#saveContainerBtn"), resetContainer: $("#resetContainerBtn"), showContainerForm: $("#showContainerFormBtn"),
  search: $("#searchInput"), containerFilter: $("#containerFilter"), categoryFilter: $("#categoryFilter"), statusFilter: $("#statusFilter"), categoryList: $("#categoryList"), itemList: $("#itemList"), itemTemplate: $("#itemTemplate"), containerList: $("#containerList"), containerTemplate: $("#containerTemplate"), resultTitle: $("#resultTitle"), activeContainerHint: $("#activeContainerHint"), clearFilters: $("#clearFiltersBtn"), totalCount: $("#totalCount"), containerCount: $("#containerCount"), pendingCount: $("#pendingCount"), exportJson: $("#exportJsonBtn"), exportCsv: $("#exportCsvBtn"), importJson: $("#importJsonInput"),
};

function id() { return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function status(text, mode = "neutral") { el.sync.textContent = text; el.sync.dataset.mode = mode; }
function normalizeState(v) { return STATES.includes(v) ? v : "保留"; }
function containerById(cid) { return containers.find((c) => c.id === cid); }
function norm(v) { return String(v || "").trim().toLowerCase(); }
function requireLogin() { if (!user) throw new Error("请先登录。"); }
function setDisabled(disabled) { [el.itemForm, el.containerForm, el.showContainerForm, el.exportJson, el.exportCsv].forEach((x) => { x.disabled = disabled; x.querySelectorAll?.("input, select, textarea, button").forEach((c) => { c.disabled = disabled; }); }); }

function dbContainer(row) { return { id: row.id, name: row.name || "", type: row.type || "容器", location: row.location || "", note: row.note || "", updatedAt: row.updated_at || today() }; }
function dbItem(row) { return { id: row.id, name: row.name || "", category: row.category || "未分类", containerId: row.container_id || "", location: row.location || "", state: normalizeState(row.state), note: row.note || "", updatedAt: row.updated_at || today() }; }
function toDbContainer(c) { return { id: c.id, user_id: user.id, name: c.name, type: c.type || "容器", location: c.location, note: c.note || "", updated_at: c.updatedAt || today() }; }
function toDbItem(i) { return { id: i.id, user_id: user.id, name: i.name, category: i.category || "未分类", container_id: i.containerId || null, location: i.location, state: normalizeState(i.state), note: i.note || "", updated_at: i.updatedAt || today() }; }

async function refresh() {
  if (!cloud) { status("Supabase 未加载", "warn"); return; }
  if (!user) { loggedOut(); return; }
  try {
    status("正在同步...");
    const [cr, ir] = await Promise.all([
      cloud.from("containers").select("*").order("updated_at", { ascending: false }),
      cloud.from("items").select("*").order("updated_at", { ascending: false }),
    ]);
    if (cr.error) throw cr.error;
    if (ir.error) throw ir.error;
    containers = (cr.data || []).map(dbContainer);
    items = (ir.data || []).map(dbItem);
    el.authPanel.hidden = true;
    el.logout.hidden = false;
    setDisabled(false);
    status(`云端已同步：${user.email || "已登录"}`, "ok");
  } catch (e) {
    status(`同步失败：${e.message}`, "warn");
  }
  render();
}

function loggedOut() {
  user = null; containers = []; items = []; activeContainerId = "";
  el.authPanel.hidden = false; el.logout.hidden = true; setDisabled(true); status("请先登录", "warn"); render();
}

async function login(e) {
  e.preventDefault();
  const email = el.email.value.trim();
  const redirectTo = location.href.split("#")[0];
  const { error } = await cloud.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  if (error) window.alert(`发送失败：${error.message}`); else status("登录链接已发送，请查看邮箱", "ok");
}
async function logout() { await cloud.auth.signOut(); loggedOut(); }

function visibleItems() {
  const q = norm(el.search.value), cat = el.categoryFilter.value, st = el.statusFilter.value, cid = activeContainerId || el.containerFilter.value;
  return items.filter((i) => {
    const c = containerById(i.containerId);
    const hay = norm([i.name, i.category, i.location, i.state, i.note, c?.name, c?.type, c?.location, c?.note].join(" "));
    return (!q || hay.includes(q)) && (!cat || i.category === cat) && (!st || i.state === st) && (!cid || i.containerId === cid);
  });
}

function renderStats() { el.totalCount.textContent = items.length; el.containerCount.textContent = containers.length; el.pendingCount.textContent = items.filter((i) => i.state !== "保留").length; }
function renderOptions() {
  const cat = el.categoryFilter.value, cf = el.containerFilter.value, ic = el.itemContainer.value;
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  el.categoryFilter.innerHTML = '<option value="">全部类别</option>'; el.categoryList.innerHTML = "";
  cats.forEach((c) => { el.categoryFilter.append(new Option(c, c)); const o = document.createElement("option"); o.value = c; el.categoryList.append(o); });
  el.categoryFilter.value = cats.includes(cat) ? cat : "";
  el.containerFilter.innerHTML = '<option value="">全部容器</option>'; el.itemContainer.innerHTML = '<option value="">未指定容器</option>';
  containers.forEach((c) => { const label = `${c.name} · ${c.location}`; el.containerFilter.append(new Option(label, c.id)); el.itemContainer.append(new Option(label, c.id)); });
  el.containerFilter.value = containers.some((c) => c.id === cf) ? cf : "";
  el.itemContainer.value = containers.some((c) => c.id === ic) ? ic : "";
}
function renderContainers() {
  el.containerList.innerHTML = "";
  if (!containers.length) { const d = document.createElement("div"); d.className = "empty"; d.textContent = user ? "还没有容器，先新增一个抽屉、箱子或文件袋。" : "登录后显示你的容器。"; el.containerList.append(d); return; }
  containers.forEach((c) => {
    const card = el.containerTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("is-active", activeContainerId === c.id);
    card.querySelector("strong").textContent = c.name;
    card.querySelector("span").textContent = `${c.type || "容器"} · ${items.filter((i) => i.containerId === c.id).length} 件`;
    card.querySelector("p").textContent = `${c.location}${c.note ? `｜${c.note}` : ""}`;
    card.querySelector(".container-pick").onclick = () => { activeContainerId = activeContainerId === c.id ? "" : c.id; el.containerFilter.value = ""; render(); };
    card.querySelector(".container-edit").onclick = () => editContainer(c.id);
    card.querySelector(".container-delete").onclick = () => deleteContainer(c.id);
    el.containerList.append(card);
  });
}
function renderItems() {
  const list = visibleItems(); el.itemList.innerHTML = ""; el.resultTitle.textContent = list.length === items.length ? "全部物品" : `筛选结果：${list.length} 件`;
  const active = containerById(activeContainerId || el.containerFilter.value); el.activeContainerHint.textContent = active ? `当前容器：${active.name}` : "";
  if (!list.length) { const d = document.createElement("div"); d.className = "empty"; d.textContent = user ? "没有找到匹配的物品。" : "登录后显示你的物品。"; el.itemList.append(d); return; }
  list.forEach((i) => {
    const c = containerById(i.containerId), card = el.itemTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = i.name;
    card.querySelector(".meta").textContent = [i.category || "未分类", c?.name || "未指定容器", `更新 ${i.updatedAt}`].join(" · ");
    const s = card.querySelector(".status"); s.textContent = i.state; s.dataset.state = i.state;
    card.querySelector(".item-location").textContent = i.location; card.querySelector(".item-note").textContent = i.note || "无备注";
    card.querySelector(".edit-btn").onclick = () => editItem(i.id); card.querySelector(".delete-btn").onclick = () => deleteItem(i.id);
    el.itemList.append(card);
  });
}
function render() { renderStats(); renderOptions(); renderContainers(); renderItems(); }

function resetItem() { el.itemForm.reset(); el.itemId.value = ""; el.itemFormTitle.textContent = "添加物品"; el.saveItem.textContent = "添加物品"; el.itemContainer.value = activeContainerId || el.containerFilter.value || ""; applyContainerLocation(); }
function resetContainer() { el.containerForm.reset(); el.containerId.value = ""; el.containerFormTitle.textContent = "容器信息"; el.saveContainer.textContent = "保存容器"; }
function applyContainerLocation() { const c = containerById(el.itemContainer.value); if (c && !el.location.value.trim()) el.location.value = `${c.location} > ${c.name}`; }
function editItem(iid) { const i = items.find((x) => x.id === iid); if (!i) return; el.itemId.value = i.id; el.name.value = i.name; el.category.value = i.category; el.itemContainer.value = i.containerId || ""; el.location.value = i.location; el.state.value = normalizeState(i.state); el.note.value = i.note; el.itemFormTitle.textContent = "编辑物品"; el.saveItem.textContent = "保存修改"; el.name.focus(); }
function editContainer(cid) { const c = containerById(cid); if (!c) return; el.containerId.value = c.id; el.containerName.value = c.name; el.containerType.value = c.type; el.containerLocation.value = c.location; el.containerNote.value = c.note; el.containerFormTitle.textContent = "编辑容器"; el.saveContainer.textContent = "保存修改"; el.containerName.focus(); }

async function saveItem(e) { e.preventDefault(); try { requireLogin(); const item = { id: el.itemId.value || id(), name: el.name.value.trim(), category: el.category.value.trim() || "未分类", containerId: el.itemContainer.value, location: el.location.value.trim(), state: normalizeState(el.state.value), note: el.note.value.trim(), updatedAt: today() }; const { error } = await cloud.from("items").upsert(toDbItem(item)); if (error) throw error; resetItem(); await refresh(); } catch (err) { window.alert(`保存失败：${err.message}`); } }
async function saveContainer(e) { e.preventDefault(); try { requireLogin(); const c = { id: el.containerId.value || id(), name: el.containerName.value.trim(), type: el.containerType.value.trim() || "容器", location: el.containerLocation.value.trim(), note: el.containerNote.value.trim(), updatedAt: today() }; const { error } = await cloud.from("containers").upsert(toDbContainer(c)); if (error) throw error; resetContainer(); await refresh(); } catch (err) { window.alert(`保存失败：${err.message}`); } }
async function deleteItem(iid) { const i = items.find((x) => x.id === iid); if (!i || !confirm(`删除「${i.name}」？`)) return; const { error } = await cloud.from("items").delete().eq("id", iid); if (error) alert(`删除失败：${error.message}`); await refresh(); }
async function deleteContainer(cid) { const c = containerById(cid); if (!c) return; const count = items.filter((i) => i.containerId === cid).length; if (!confirm(count ? `删除「${c.name}」？其中 ${count} 件物品会变成未指定容器。` : `删除「${c.name}」？`)) return; const affected = items.filter((i) => i.containerId === cid).map((i) => toDbItem({ ...i, containerId: "", updatedAt: today() })); if (affected.length) { const r = await cloud.from("items").upsert(affected); if (r.error) return alert(`删除失败：${r.error.message}`); } const { error } = await cloud.from("containers").delete().eq("id", cid); if (error) alert(`删除失败：${error.message}`); if (activeContainerId === cid) activeContainerId = ""; await refresh(); }

function download(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function csv() { const rows = [["物品名", "类别", "所属容器", "容器位置", "具体位置", "状态", "备注", "最后确认日期"], ...items.map((i) => { const c = containerById(i.containerId); return [i.name, i.category, c?.name || "", c?.location || "", i.location, i.state, i.note, i.updatedAt]; })]; return rows.map((r) => r.map((x) => `"${String(x || "").replaceAll('"', '""')}"`).join(",")).join("\n"); }
async function importJson(file) { const reader = new FileReader(); reader.onload = async () => { try { requireLogin(); const parsed = JSON.parse(String(reader.result)); const cs = (parsed.containers || []).map((c) => toDbContainer({ id: c.id || id(), name: String(c.name || "").trim(), type: String(c.type || "容器").trim(), location: String(c.location || "").trim(), note: String(c.note || "").trim(), updatedAt: String(c.updatedAt || today()).trim() })).filter((c) => c.name && c.location); const its = ((parsed.items || (Array.isArray(parsed) ? parsed : []))).map((i) => toDbItem({ id: i.id || id(), name: String(i.name || "").trim(), category: String(i.category || "未分类").trim(), containerId: String(i.containerId || "").trim(), location: String(i.location || "").trim(), state: normalizeState(i.state), note: String(i.note || "").trim(), updatedAt: String(i.updatedAt || today()).trim() })).filter((i) => i.name && i.location); if (cs.length) { const r = await cloud.from("containers").upsert(cs); if (r.error) throw r.error; } if (its.length) { const r = await cloud.from("items").upsert(its); if (r.error) throw r.error; } await refresh(); alert(`已导入 ${its.length} 件物品和 ${cs.length} 个容器。`); } catch (err) { alert(`导入失败：${err.message}`); } }; reader.readAsText(file, "utf-8"); }

el.loginForm.onsubmit = login; el.logout.onclick = logout; el.itemForm.onsubmit = saveItem; el.containerForm.onsubmit = saveContainer; el.resetItem.onclick = resetItem; el.resetContainer.onclick = resetContainer; el.showContainerForm.onclick = () => { resetContainer(); el.containerName.focus(); }; el.itemContainer.onchange = applyContainerLocation; el.search.oninput = renderItems; el.categoryFilter.onchange = renderItems; el.statusFilter.onchange = renderItems; el.containerFilter.onchange = () => { activeContainerId = ""; render(); }; el.clearFilters.onclick = () => { activeContainerId = ""; el.search.value = ""; el.containerFilter.value = ""; el.categoryFilter.value = ""; el.statusFilter.value = ""; render(); }; el.exportJson.onclick = () => download(`room-inventory-${today()}.json`, JSON.stringify({ containers, items }, null, 2), "application/json"); el.exportCsv.onclick = () => download(`room-inventory-${today()}.csv`, `\ufeff${csv()}`, "text/csv;charset=utf-8"); el.importJson.onchange = (e) => { const [file] = e.target.files; if (file) importJson(file); e.target.value = ""; };

(async function init() { if (!cloud) { loggedOut(); status("Supabase 未加载", "warn"); return; } const { data } = await cloud.auth.getSession(); user = data.session?.user || null; if (user) await refresh(); else loggedOut(); cloud.auth.onAuthStateChange(async (_event, session) => { user = session?.user || null; if (user) await refresh(); else loggedOut(); }); })();
