const SUPABASE_URL = "https://uliflnwuorjuldlcibnp.supabase.co";
const SUPABASE_KEY = "sb_publishable_am2Py8DVUyPT32JwoBLTVg_b9Q8OAZw";
const STATES = ["保留", "待处理", "待送人", "待丢弃", "待维修"];
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let user = null;
let containers = [];
let items = [];
let activeContainerId = "";

const $ = (id) => document.querySelector(id);
const ui = {
  loginPage: $("#loginPage"), appShell: $("#appShell"), loginForm: $("#loginForm"), email: $("#emailInput"), password: $("#passwordInput"), signup: $("#signupBtn"), loginHint: $("#loginHint"), logout: $("#logoutBtn"), sync: $("#syncStatus"),
  itemForm: $("#itemForm"), itemFormTitle: $("#itemFormTitle"), itemId: $("#itemId"), name: $("#nameInput"), category: $("#categoryInput"), itemContainer: $("#itemContainerSelect"), location: $("#locationInput"), state: $("#stateInput"), note: $("#noteInput"), saveItem: $("#saveItemBtn"), resetItem: $("#resetItemBtn"),
  containerForm: $("#containerForm"), containerFormTitle: $("#containerFormTitle"), containerId: $("#containerId"), containerName: $("#containerNameInput"), containerType: $("#containerTypeInput"), containerLocation: $("#containerLocationInput"), containerNote: $("#containerNoteInput"), saveContainer: $("#saveContainerBtn"), resetContainer: $("#resetContainerBtn"), showContainerForm: $("#showContainerFormBtn"),
  search: $("#searchInput"), containerFilter: $("#containerFilter"), categoryFilter: $("#categoryFilter"), statusFilter: $("#statusFilter"), categoryList: $("#categoryList"), itemList: $("#itemList"), itemTemplate: $("#itemTemplate"), containerList: $("#containerList"), containerTemplate: $("#containerTemplate"), resultTitle: $("#resultTitle"), activeContainerHint: $("#activeContainerHint"), clearFilters: $("#clearFiltersBtn"), totalCount: $("#totalCount"), containerCount: $("#containerCount"), pendingCount: $("#pendingCount"), exportJson: $("#exportJsonBtn"), exportCsv: $("#exportCsvBtn"), importJson: $("#importJsonInput"),
};

function makeId() { return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function state(v) { return STATES.includes(v) ? v : "保留"; }
function msg(text, mode = "neutral") { ui.sync.textContent = text; ui.sync.dataset.mode = mode; }
function showLogin(text = "第一次使用请先注册。之后浏览器会保持登录状态。") { ui.loginPage.hidden = false; ui.appShell.hidden = true; ui.loginHint.textContent = text; }
function showApp() { ui.loginPage.hidden = true; ui.appShell.hidden = false; }
function containerById(id) { return containers.find((c) => c.id === id); }
function dbContainer(r) { return { id: r.id, name: r.name || "", type: r.type || "容器", location: r.location || "", note: r.note || "", updatedAt: r.updated_at || today() }; }
function dbItem(r) { return { id: r.id, name: r.name || "", category: r.category || "未分类", containerId: r.container_id || "", location: r.location || "", state: state(r.state), note: r.note || "", updatedAt: r.updated_at || today() }; }
function toDbContainer(c) { return { id: c.id, user_id: user.id, name: c.name, type: c.type || "容器", location: c.location, note: c.note || "", updated_at: c.updatedAt || today() }; }
function toDbItem(i) { return { id: i.id, user_id: user.id, name: i.name, category: i.category || "未分类", container_id: i.containerId || null, location: i.location, state: state(i.state), note: i.note || "", updated_at: i.updatedAt || today() }; }

async function loadData() {
  if (!user) return;
  msg("正在同步...");
  const [cr, ir] = await Promise.all([
    sb.from("containers").select("*").order("updated_at", { ascending: false }),
    sb.from("items").select("*").order("updated_at", { ascending: false }),
  ]);
  if (cr.error) throw cr.error;
  if (ir.error) throw ir.error;
  containers = (cr.data || []).map(dbContainer);
  items = (ir.data || []).map(dbItem);
  showApp();
  msg(`云端已同步：${user.email || "已登录"}`, "ok");
  render();
}

async function login(event) {
  event.preventDefault();
  const email = ui.email.value.trim();
  const password = ui.password.value;
  if (!email || !password) return alert("请先填写邮箱和密码。");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return alert(`登录失败：${error.message}`);
  msg("登录成功，正在同步...", "ok");
}

async function signup() {
  const email = ui.email.value.trim();
  const password = ui.password.value;
  if (!email || !password) return alert("请先填写邮箱和密码。");
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href.split("#")[0] } });
  if (error) return alert(`注册失败：${error.message}`);
  if (data.session) return msg("注册成功，正在同步...", "ok");
  showLogin("注册成功。如果 Supabase 要求邮箱确认，请先按邮件提示确认，再回来登录。");
}

async function logout() {
  await sb.auth.signOut();
  user = null; containers = []; items = []; activeContainerId = "";
  render();
  showLogin();
}

function filteredItems() {
  const q = String(ui.search.value || "").trim().toLowerCase();
  const category = ui.categoryFilter.value;
  const st = ui.statusFilter.value;
  const cid = activeContainerId || ui.containerFilter.value;
  return items.filter((i) => {
    const c = containerById(i.containerId);
    const hay = [i.name, i.category, i.location, i.state, i.note, c?.name, c?.type, c?.location, c?.note].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!category || i.category === category) && (!st || i.state === st) && (!cid || i.containerId === cid);
  });
}

function renderStats() { ui.totalCount.textContent = items.length; ui.containerCount.textContent = containers.length; ui.pendingCount.textContent = items.filter((i) => i.state !== "保留").length; }
function renderOptions() {
  const selectedCategory = ui.categoryFilter.value;
  const selectedContainer = ui.containerFilter.value;
  const selectedItemContainer = ui.itemContainer.value;
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  ui.categoryFilter.innerHTML = '<option value="">全部类别</option>'; ui.categoryList.innerHTML = "";
  categories.forEach((c) => { ui.categoryFilter.append(new Option(c, c)); const opt = document.createElement("option"); opt.value = c; ui.categoryList.append(opt); });
  ui.categoryFilter.value = categories.includes(selectedCategory) ? selectedCategory : "";
  ui.containerFilter.innerHTML = '<option value="">全部容器</option>'; ui.itemContainer.innerHTML = '<option value="">未指定容器</option>';
  containers.forEach((c) => { const label = `${c.name} · ${c.location}`; ui.containerFilter.append(new Option(label, c.id)); ui.itemContainer.append(new Option(label, c.id)); });
  ui.containerFilter.value = containers.some((c) => c.id === selectedContainer) ? selectedContainer : "";
  ui.itemContainer.value = containers.some((c) => c.id === selectedItemContainer) ? selectedItemContainer : "";
}
function renderContainers() {
  ui.containerList.innerHTML = "";
  if (!containers.length) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "还没有容器，先新增一个抽屉、箱子或文件袋。"; ui.containerList.append(empty); return; }
  containers.forEach((c) => {
    const card = ui.containerTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("is-active", activeContainerId === c.id);
    card.querySelector("strong").textContent = c.name;
    card.querySelector("span").textContent = `${c.type || "容器"} · ${items.filter((i) => i.containerId === c.id).length} 件`;
    card.querySelector("p").textContent = `${c.location}${c.note ? `｜${c.note}` : ""}`;
    card.querySelector(".container-pick").onclick = () => { activeContainerId = activeContainerId === c.id ? "" : c.id; ui.containerFilter.value = ""; render(); };
    card.querySelector(".container-edit").onclick = () => editContainer(c.id);
    card.querySelector(".container-delete").onclick = () => deleteContainer(c.id);
    ui.containerList.append(card);
  });
}
function renderItems() {
  const visible = filteredItems();
  ui.itemList.innerHTML = "";
  ui.resultTitle.textContent = visible.length === items.length ? "全部物品" : `筛选结果：${visible.length} 件`;
  const active = containerById(activeContainerId || ui.containerFilter.value);
  ui.activeContainerHint.textContent = active ? `当前容器：${active.name}` : "";
  if (!visible.length) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "没有找到匹配的物品。"; ui.itemList.append(empty); return; }
  visible.forEach((i) => {
    const c = containerById(i.containerId);
    const card = ui.itemTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = i.name;
    card.querySelector(".meta").textContent = [i.category || "未分类", c?.name || "未指定容器", `更新 ${i.updatedAt}`].join(" · ");
    const s = card.querySelector(".status"); s.textContent = i.state; s.dataset.state = i.state;
    card.querySelector(".item-location").textContent = i.location;
    card.querySelector(".item-note").textContent = i.note || "无备注";
    card.querySelector(".edit-btn").onclick = () => editItem(i.id);
    card.querySelector(".delete-btn").onclick = () => deleteItem(i.id);
    ui.itemList.append(card);
  });
}
function render() { renderStats(); renderOptions(); renderContainers(); renderItems(); }

function resetItemForm() { ui.itemForm.reset(); ui.itemId.value = ""; ui.itemFormTitle.textContent = "添加物品"; ui.saveItem.textContent = "添加物品"; ui.itemContainer.value = activeContainerId || ui.containerFilter.value || ""; applyContainerLocation(); }
function resetContainerForm() { ui.containerForm.reset(); ui.containerId.value = ""; ui.containerFormTitle.textContent = "容器信息"; ui.saveContainer.textContent = "保存容器"; }
function applyContainerLocation() { const c = containerById(ui.itemContainer.value); if (c && !ui.location.value.trim()) ui.location.value = `${c.location} > ${c.name}`; }
function editItem(id) { const i = items.find((x) => x.id === id); if (!i) return; ui.itemId.value = i.id; ui.name.value = i.name; ui.category.value = i.category; ui.itemContainer.value = i.containerId || ""; ui.location.value = i.location; ui.state.value = state(i.state); ui.note.value = i.note; ui.itemFormTitle.textContent = "编辑物品"; ui.saveItem.textContent = "保存修改"; ui.name.focus(); }
function editContainer(id) { const c = containerById(id); if (!c) return; ui.containerId.value = c.id; ui.containerName.value = c.name; ui.containerType.value = c.type; ui.containerLocation.value = c.location; ui.containerNote.value = c.note; ui.containerFormTitle.textContent = "编辑容器"; ui.saveContainer.textContent = "保存修改"; ui.containerName.focus(); }

async function saveItem(event) { event.preventDefault(); try { const item = { id: ui.itemId.value || makeId(), name: ui.name.value.trim(), category: ui.category.value.trim() || "未分类", containerId: ui.itemContainer.value, location: ui.location.value.trim(), state: state(ui.state.value), note: ui.note.value.trim(), updatedAt: today() }; const { error } = await sb.from("items").upsert(toDbItem(item)); if (error) throw error; resetItemForm(); await loadData(); } catch (e) { alert(`保存失败：${e.message}`); } }
async function saveContainer(event) { event.preventDefault(); try { const c = { id: ui.containerId.value || makeId(), name: ui.containerName.value.trim(), type: ui.containerType.value.trim() || "容器", location: ui.containerLocation.value.trim(), note: ui.containerNote.value.trim(), updatedAt: today() }; const { error } = await sb.from("containers").upsert(toDbContainer(c)); if (error) throw error; resetContainerForm(); await loadData(); } catch (e) { alert(`保存失败：${e.message}`); } }
async function deleteItem(id) { const i = items.find((x) => x.id === id); if (!i || !confirm(`删除「${i.name}」？`)) return; const { error } = await sb.from("items").delete().eq("id", id); if (error) alert(`删除失败：${error.message}`); await loadData(); }
async function deleteContainer(id) { const c = containerById(id); if (!c) return; const count = items.filter((i) => i.containerId === id).length; if (!confirm(count ? `删除「${c.name}」？其中 ${count} 件物品会变成未指定容器。` : `删除「${c.name}」？`)) return; const changed = items.filter((i) => i.containerId === id).map((i) => toDbItem({ ...i, containerId: "", updatedAt: today() })); if (changed.length) { const r = await sb.from("items").upsert(changed); if (r.error) return alert(`删除失败：${r.error.message}`); } const { error } = await sb.from("containers").delete().eq("id", id); if (error) alert(`删除失败：${error.message}`); if (activeContainerId === id) activeContainerId = ""; await loadData(); }

function download(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }
function toCsv() { const rows = [["物品名", "类别", "所属容器", "容器位置", "具体位置", "状态", "备注", "最后确认日期"], ...items.map((i) => { const c = containerById(i.containerId); return [i.name, i.category, c?.name || "", c?.location || "", i.location, i.state, i.note, i.updatedAt]; })]; return rows.map((r) => r.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n"); }
async function importJson(file) { const reader = new FileReader(); reader.onload = async () => { try { const parsed = JSON.parse(String(reader.result)); const cs = (parsed.containers || []).map((c) => toDbContainer({ id: c.id || makeId(), name: String(c.name || "").trim(), type: String(c.type || "容器").trim(), location: String(c.location || "").trim(), note: String(c.note || "").trim(), updatedAt: String(c.updatedAt || today()).trim() })).filter((c) => c.name && c.location); const its = (parsed.items || (Array.isArray(parsed) ? parsed : [])).map((i) => toDbItem({ id: i.id || makeId(), name: String(i.name || "").trim(), category: String(i.category || "未分类").trim(), containerId: String(i.containerId || "").trim(), location: String(i.location || "").trim(), state: state(i.state), note: String(i.note || "").trim(), updatedAt: String(i.updatedAt || today()).trim() })).filter((i) => i.name && i.location); if (cs.length) { const r = await sb.from("containers").upsert(cs); if (r.error) throw r.error; } if (its.length) { const r = await sb.from("items").upsert(its); if (r.error) throw r.error; } await loadData(); alert(`已导入 ${its.length} 件物品和 ${cs.length} 个容器。`); } catch (e) { alert(`导入失败：${e.message}`); } }; reader.readAsText(file, "utf-8"); }

ui.loginForm.onsubmit = login;
ui.signup.onclick = signup;
ui.logout.onclick = logout;
ui.itemForm.onsubmit = saveItem;
ui.containerForm.onsubmit = saveContainer;
ui.resetItem.onclick = resetItemForm;
ui.resetContainer.onclick = resetContainerForm;
ui.showContainerForm.onclick = () => { resetContainerForm(); ui.containerName.focus(); };
ui.itemContainer.onchange = applyContainerLocation;
ui.search.oninput = renderItems;
ui.categoryFilter.onchange = renderItems;
ui.statusFilter.onchange = renderItems;
ui.containerFilter.onchange = () => { activeContainerId = ""; render(); };
ui.clearFilters.onclick = () => { activeContainerId = ""; ui.search.value = ""; ui.containerFilter.value = ""; ui.categoryFilter.value = ""; ui.statusFilter.value = ""; render(); };
ui.exportJson.onclick = () => download(`room-inventory-${today()}.json`, JSON.stringify({ containers, items }, null, 2), "application/json");
ui.exportCsv.onclick = () => download(`room-inventory-${today()}.csv`, `\ufeff${toCsv()}`, "text/csv;charset=utf-8");
ui.importJson.onchange = (event) => { const [file] = event.target.files; if (file) importJson(file); event.target.value = ""; };

(async function init() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) history.replaceState({}, document.title, location.pathname);
  }
  const { data } = await sb.auth.getSession();
  user = data.session?.user || null;
  if (user) await loadData(); else showLogin();
  sb.auth.onAuthStateChange(async (_event, session) => {
    user = session?.user || null;
    if (user) await loadData(); else showLogin();
  });
})();
