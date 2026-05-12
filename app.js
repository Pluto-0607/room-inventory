const SUPABASE_URL = "https://uliflnwuorjuldlcibnp.supabase.co";
const SUPABASE_KEY = "sb_publishable_am2Py8DVUyPT32JwoBLTVg_b9Q8OAZw";

const ITEM_KEY = "room-inventory-items-local";
const CONTAINER_KEY = "room-inventory-containers-local";
const STATES = ["保留", "待处理", "待送人", "待丢弃", "待维修"];

const cloud = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY) || null;
let isCloudReady = false;
let containers = [];
let items = [];
let activeContainerId = "";

const elements = {
  syncStatus: document.querySelector("#syncStatus"),
  itemForm: document.querySelector("#itemForm"),
  itemFormTitle: document.querySelector("#itemFormTitle"),
  itemId: document.querySelector("#itemId"),
  name: document.querySelector("#nameInput"),
  category: document.querySelector("#categoryInput"),
  itemContainer: document.querySelector("#itemContainerSelect"),
  location: document.querySelector("#locationInput"),
  state: document.querySelector("#stateInput"),
  note: document.querySelector("#noteInput"),
  saveItem: document.querySelector("#saveItemBtn"),
  resetItem: document.querySelector("#resetItemBtn"),
  containerForm: document.querySelector("#containerForm"),
  containerFormTitle: document.querySelector("#containerFormTitle"),
  containerId: document.querySelector("#containerId"),
  containerName: document.querySelector("#containerNameInput"),
  containerType: document.querySelector("#containerTypeInput"),
  containerLocation: document.querySelector("#containerLocationInput"),
  containerNote: document.querySelector("#containerNoteInput"),
  saveContainer: document.querySelector("#saveContainerBtn"),
  resetContainer: document.querySelector("#resetContainerBtn"),
  showContainerForm: document.querySelector("#showContainerFormBtn"),
  search: document.querySelector("#searchInput"),
  containerFilter: document.querySelector("#containerFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  categoryList: document.querySelector("#categoryList"),
  itemList: document.querySelector("#itemList"),
  itemTemplate: document.querySelector("#itemTemplate"),
  containerList: document.querySelector("#containerList"),
  containerTemplate: document.querySelector("#containerTemplate"),
  resultTitle: document.querySelector("#resultTitle"),
  activeContainerHint: document.querySelector("#activeContainerHint"),
  clearFilters: document.querySelector("#clearFiltersBtn"),
  totalCount: document.querySelector("#totalCount"),
  containerCount: document.querySelector("#containerCount"),
  pendingCount: document.querySelector("#pendingCount"),
  exportJson: document.querySelector("#exportJsonBtn"),
  exportCsv: document.querySelector("#exportCsvBtn"),
  importJson: document.querySelector("#importJsonInput"),
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setSyncStatus(text, mode = "neutral") {
  elements.syncStatus.textContent = text;
  elements.syncStatus.dataset.mode = mode;
}

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeLocal() {
  localStorage.setItem(CONTAINER_KEY, JSON.stringify(containers));
  localStorage.setItem(ITEM_KEY, JSON.stringify(items));
}

function normalizeState(state) {
  return STATES.includes(state) ? state : "保留";
}

function containerById(id) {
  return containers.find((container) => container.id === id);
}

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function uniqueValues(key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function dbContainerToApp(row) {
  return {
    id: row.id,
    name: row.name || "",
    type: row.type || "容器",
    location: row.location || "",
    note: row.note || "",
    updatedAt: row.updated_at || today(),
  };
}

function appContainerToDb(container) {
  return {
    id: container.id,
    name: container.name,
    type: container.type || "容器",
    location: container.location,
    note: container.note || "",
    updated_at: container.updatedAt || today(),
  };
}

function dbItemToApp(row) {
  return {
    id: row.id,
    name: row.name || "",
    category: row.category || "未分类",
    containerId: row.container_id || "",
    location: row.location || "",
    state: normalizeState(row.state),
    note: row.note || "",
    updatedAt: row.updated_at || today(),
  };
}

function appItemToDb(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category || "未分类",
    container_id: item.containerId || null,
    location: item.location,
    state: normalizeState(item.state),
    note: item.note || "",
    updated_at: item.updatedAt || today(),
  };
}

async function loadFromCloud() {
  if (!cloud) throw new Error("Supabase client is not loaded");

  const [containerResult, itemResult] = await Promise.all([
    cloud.from("containers").select("*").order("updated_at", { ascending: false }),
    cloud.from("items").select("*").order("updated_at", { ascending: false }),
  ]);

  if (containerResult.error) throw containerResult.error;
  if (itemResult.error) throw itemResult.error;

  containers = (containerResult.data || []).map(dbContainerToApp);
  items = (itemResult.data || []).map(dbItemToApp);
  writeLocal();
}

function loadLocalMode() {
  containers = readLocal(CONTAINER_KEY);
  items = readLocal(ITEM_KEY);
  isCloudReady = false;
  setSyncStatus("本地模式", "warn");
}

async function refreshData() {
  try {
    setSyncStatus("正在同步...", "neutral");
    await loadFromCloud();
    isCloudReady = true;
    setSyncStatus("云端已同步", "ok");
  } catch (error) {
    loadLocalMode();
    console.warn("Supabase sync failed:", error);
  }
  render();
}

async function upsertContainer(container) {
  if (!isCloudReady) {
    containers = containers.some((entry) => entry.id === container.id)
      ? containers.map((entry) => (entry.id === container.id ? container : entry))
      : [container, ...containers];
    writeLocal();
    return;
  }

  const { error } = await cloud.from("containers").upsert(appContainerToDb(container));
  if (error) throw error;
  await refreshData();
}

async function upsertItem(item) {
  if (!isCloudReady) {
    items = items.some((entry) => entry.id === item.id)
      ? items.map((entry) => (entry.id === item.id ? item : entry))
      : [item, ...items];
    writeLocal();
    return;
  }

  const { error } = await cloud.from("items").upsert(appItemToDb(item));
  if (error) throw error;
  await refreshData();
}

async function removeContainer(id) {
  if (!isCloudReady) {
    containers = containers.filter((entry) => entry.id !== id);
    items = items.map((item) => (item.containerId === id ? { ...item, containerId: "" } : item));
    writeLocal();
    return;
  }

  const affectedItems = items.filter((item) => item.containerId === id).map((item) => ({
    ...item,
    containerId: "",
    updatedAt: today(),
  }));

  if (affectedItems.length) {
    const { error: itemError } = await cloud.from("items").upsert(affectedItems.map(appItemToDb));
    if (itemError) throw itemError;
  }

  const { error } = await cloud.from("containers").delete().eq("id", id);
  if (error) throw error;
  await refreshData();
}

async function removeItem(id) {
  if (!isCloudReady) {
    items = items.filter((entry) => entry.id !== id);
    writeLocal();
    return;
  }

  const { error } = await cloud.from("items").delete().eq("id", id);
  if (error) throw error;
  await refreshData();
}

function filteredItems() {
  const query = normalize(elements.search.value);
  const category = elements.categoryFilter.value;
  const state = elements.statusFilter.value;
  const containerId = activeContainerId || elements.containerFilter.value;

  return items.filter((item) => {
    const container = containerById(item.containerId);
    const haystack = normalize([
      item.name,
      item.category,
      item.location,
      item.state,
      item.note,
      container?.name,
      container?.type,
      container?.location,
      container?.note,
    ].join(" "));

    return (!query || haystack.includes(query))
      && (!category || item.category === category)
      && (!state || item.state === state)
      && (!containerId || item.containerId === containerId);
  });
}

function renderStats() {
  elements.totalCount.textContent = items.length;
  elements.containerCount.textContent = containers.length;
  elements.pendingCount.textContent = items.filter((item) => item.state !== "保留").length;
}

function renderOptions() {
  const selectedCategory = elements.categoryFilter.value;
  const selectedContainer = elements.containerFilter.value;
  const selectedItemContainer = elements.itemContainer.value;
  const categories = uniqueValues("category");

  elements.categoryFilter.innerHTML = '<option value="">全部类别</option>';
  elements.categoryList.innerHTML = "";
  categories.forEach((category) => {
    elements.categoryFilter.append(new Option(category, category));
    const option = document.createElement("option");
    option.value = category;
    elements.categoryList.append(option);
  });
  elements.categoryFilter.value = categories.includes(selectedCategory) ? selectedCategory : "";

  elements.containerFilter.innerHTML = '<option value="">全部容器</option>';
  elements.itemContainer.innerHTML = '<option value="">未指定容器</option>';
  containers.forEach((container) => {
    const label = `${container.name} · ${container.location}`;
    elements.containerFilter.append(new Option(label, container.id));
    elements.itemContainer.append(new Option(label, container.id));
  });

  elements.containerFilter.value = containers.some((container) => container.id === selectedContainer) ? selectedContainer : "";
  elements.itemContainer.value = containers.some((container) => container.id === selectedItemContainer) ? selectedItemContainer : "";
}

function renderContainers() {
  elements.containerList.innerHTML = "";

  if (!containers.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "还没有容器，先新增一个抽屉、箱子或文件袋。";
    elements.containerList.append(empty);
    return;
  }

  containers.forEach((container) => {
    const count = items.filter((item) => item.containerId === container.id).length;
    const card = elements.containerTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("is-active", activeContainerId === container.id);
    card.querySelector("strong").textContent = container.name;
    card.querySelector("span").textContent = `${container.type || "容器"} · ${count} 件`;
    card.querySelector("p").textContent = `${container.location}${container.note ? `｜${container.note}` : ""}`;
    card.querySelector(".container-pick").addEventListener("click", () => {
      activeContainerId = activeContainerId === container.id ? "" : container.id;
      elements.containerFilter.value = "";
      render();
    });
    card.querySelector(".container-edit").addEventListener("click", () => editContainer(container.id));
    card.querySelector(".container-delete").addEventListener("click", () => deleteContainer(container.id));
    elements.containerList.append(card);
  });
}

function renderItems() {
  const visibleItems = filteredItems();
  elements.itemList.innerHTML = "";
  elements.resultTitle.textContent = visibleItems.length === items.length ? "全部物品" : `筛选结果：${visibleItems.length} 件`;

  const active = containerById(activeContainerId || elements.containerFilter.value);
  elements.activeContainerHint.textContent = active ? `当前容器：${active.name}` : "";

  if (!visibleItems.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "没有找到匹配的物品。";
    elements.itemList.append(empty);
    return;
  }

  visibleItems.forEach((item) => {
    const container = containerById(item.containerId);
    const card = elements.itemTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = item.name;
    card.querySelector(".meta").textContent = [item.category || "未分类", container?.name || "未指定容器", `更新 ${item.updatedAt}`].join(" · ");
    const status = card.querySelector(".status");
    status.textContent = item.state;
    status.dataset.state = item.state;
    card.querySelector(".item-location").textContent = item.location;
    card.querySelector(".item-note").textContent = item.note || "无备注";
    card.querySelector(".edit-btn").addEventListener("click", () => editItem(item.id));
    card.querySelector(".delete-btn").addEventListener("click", () => deleteItem(item.id));
    elements.itemList.append(card);
  });
}

function render() {
  renderStats();
  renderOptions();
  renderContainers();
  renderItems();
}

function resetItemForm() {
  elements.itemForm.reset();
  elements.itemId.value = "";
  elements.itemFormTitle.textContent = "添加物品";
  elements.saveItem.textContent = "添加物品";
  elements.itemContainer.value = activeContainerId || elements.containerFilter.value || "";
  applyContainerLocation();
}

function resetContainerForm() {
  elements.containerForm.reset();
  elements.containerId.value = "";
  elements.containerFormTitle.textContent = "容器信息";
  elements.saveContainer.textContent = "保存容器";
}

function applyContainerLocation() {
  const container = containerById(elements.itemContainer.value);
  if (container && !elements.location.value.trim()) {
    elements.location.value = `${container.location} > ${container.name}`;
  }
}

function editItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  elements.itemId.value = item.id;
  elements.name.value = item.name;
  elements.category.value = item.category;
  elements.itemContainer.value = item.containerId || "";
  elements.location.value = item.location;
  elements.state.value = normalizeState(item.state);
  elements.note.value = item.note;
  elements.itemFormTitle.textContent = "编辑物品";
  elements.saveItem.textContent = "保存修改";
  elements.name.focus();
}

async function deleteItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  if (!window.confirm(`删除「${item.name}」？`)) return;

  try {
    await removeItem(id);
    render();
  } catch (error) {
    window.alert(`删除失败：${error.message}`);
  }
}

function editContainer(id) {
  const container = containerById(id);
  if (!container) return;

  elements.containerId.value = container.id;
  elements.containerName.value = container.name;
  elements.containerType.value = container.type;
  elements.containerLocation.value = container.location;
  elements.containerNote.value = container.note;
  elements.containerFormTitle.textContent = "编辑容器";
  elements.saveContainer.textContent = "保存修改";
  elements.containerName.focus();
}

async function deleteContainer(id) {
  const container = containerById(id);
  if (!container) return;

  const count = items.filter((item) => item.containerId === id).length;
  const message = count
    ? `删除「${container.name}」？其中 ${count} 件物品会变成未指定容器。`
    : `删除「${container.name}」？`;
  if (!window.confirm(message)) return;

  try {
    await removeContainer(id);
    if (activeContainerId === id) activeContainerId = "";
    render();
  } catch (error) {
    window.alert(`删除失败：${error.message}`);
  }
}

async function handleItemSubmit(event) {
  event.preventDefault();

  const item = {
    id: elements.itemId.value || createId(),
    name: elements.name.value.trim(),
    category: elements.category.value.trim() || "未分类",
    containerId: elements.itemContainer.value,
    location: elements.location.value.trim(),
    state: normalizeState(elements.state.value),
    note: elements.note.value.trim(),
    updatedAt: today(),
  };

  try {
    await upsertItem(item);
    if (!isCloudReady) render();
    resetItemForm();
  } catch (error) {
    window.alert(`保存失败：${error.message}`);
  }
}

async function handleContainerSubmit(event) {
  event.preventDefault();

  const container = {
    id: elements.containerId.value || createId(),
    name: elements.containerName.value.trim(),
    type: elements.containerType.value.trim() || "容器",
    location: elements.containerLocation.value.trim(),
    note: elements.containerNote.value.trim(),
    updatedAt: today(),
  };

  try {
    await upsertContainer(container);
    if (!isCloudReady) render();
    resetContainerForm();
  } catch (error) {
    window.alert(`保存失败：${error.message}`);
  }
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv() {
  const headers = ["物品名", "类别", "所属容器", "容器位置", "具体位置", "状态", "备注", "最后确认日期"];
  const rows = items.map((item) => {
    const container = containerById(item.containerId);
    return [item.name, item.category, container?.name || "", container?.location || "", item.location, item.state, item.note, item.updatedAt];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

async function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedContainers = Array.isArray(parsed.containers) ? parsed.containers : [];
      const importedItems = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];

      containers = importedContainers.map((container) => ({
        id: container.id || createId(),
        name: String(container.name || "").trim(),
        type: String(container.type || "容器").trim(),
        location: String(container.location || "").trim(),
        note: String(container.note || "").trim(),
        updatedAt: String(container.updatedAt || today()).trim(),
      })).filter((container) => container.name && container.location);

      items = importedItems.map((item) => ({
        id: item.id || createId(),
        name: String(item.name || "").trim(),
        category: String(item.category || "未分类").trim(),
        containerId: String(item.containerId || "").trim(),
        location: String(item.location || "").trim(),
        state: normalizeState(item.state),
        note: String(item.note || "").trim(),
        updatedAt: String(item.updatedAt || today()).trim(),
      })).filter((item) => item.name && item.location);

      if (isCloudReady) {
        const containerRows = containers.map(appContainerToDb);
        const itemRows = items.map(appItemToDb);
        if (containerRows.length) {
          const { error } = await cloud.from("containers").upsert(containerRows);
          if (error) throw error;
        }
        if (itemRows.length) {
          const { error } = await cloud.from("items").upsert(itemRows);
          if (error) throw error;
        }
        await refreshData();
      } else {
        writeLocal();
        render();
      }

      resetItemForm();
      resetContainerForm();
      window.alert(`已导入 ${items.length} 件物品和 ${containers.length} 个容器。`);
    } catch (error) {
      window.alert(`导入失败：${error.message}`);
    }
  });
  reader.readAsText(file, "utf-8");
}

elements.itemForm.addEventListener("submit", handleItemSubmit);
elements.containerForm.addEventListener("submit", handleContainerSubmit);
elements.resetItem.addEventListener("click", resetItemForm);
elements.resetContainer.addEventListener("click", resetContainerForm);
elements.showContainerForm.addEventListener("click", () => {
  resetContainerForm();
  elements.containerName.focus();
});
elements.itemContainer.addEventListener("change", applyContainerLocation);
elements.search.addEventListener("input", renderItems);
elements.categoryFilter.addEventListener("change", renderItems);
elements.statusFilter.addEventListener("change", renderItems);
elements.containerFilter.addEventListener("change", () => {
  activeContainerId = "";
  render();
});
elements.clearFilters.addEventListener("click", () => {
  activeContainerId = "";
  elements.search.value = "";
  elements.containerFilter.value = "";
  elements.categoryFilter.value = "";
  elements.statusFilter.value = "";
  render();
});
elements.exportJson.addEventListener("click", () => {
  downloadFile(
    `room-inventory-${today()}.json`,
    JSON.stringify({ containers, items }, null, 2),
    "application/json",
  );
});
elements.exportCsv.addEventListener("click", () => {
  downloadFile(`room-inventory-${today()}.csv`, `\ufeff${toCsv()}`, "text/csv;charset=utf-8");
});
elements.importJson.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importJson(file);
  event.target.value = "";
});

refreshData();
