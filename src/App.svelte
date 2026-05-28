<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "./lib/supabase";
  import type { Restaurant } from "./lib/database.types";
  import type { Session } from "@supabase/supabase-js";
  import LoginPage from "./lib/LoginPage.svelte";
  import RestaurantCard from "./lib/RestaurantCard.svelte";
  import RestaurantModal from "./lib/RestaurantModal.svelte";
  import { downloadYaml, parseYaml } from "./lib/importExport";
  import { compareNames, compareCities, getCityFlag } from "./lib/utils";

  // ── Auth state ───────────────────────────────────────────────────────────
  let session = $state<Session | null>(null);
  let authLoading = $state(true);

  async function signIn(
    email: string,
    password: string,
  ): Promise<string | undefined> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : undefined;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ── State ────────────────────────────────────────────────────────────────
  let restaurants = $state<Restaurant[]>([]);
  let loading = $state(true);
  let error = $state<string | undefined>(undefined);
  let searchQuery = $state("");
  let activeCity = $state("all");
  let showFavOnly = $state(false);
  let showModal = $state(false);
  let editingRestaurant = $state<Restaurant | undefined>(undefined);
  let batchMode = $state(false);
  let selectedIds = $state(new Set<number>());
  let activeCuisine = $state("all");

  // ── Derived ──────────────────────────────────────────────────────────────
  const cities = $derived(
    [
      ...new Set(restaurants.map((r) => r.city).filter(Boolean) as string[]),
    ].sort(compareCities),
  );

  const cuisines = $derived(
    [
      ...new Set(restaurants.map((r) => r.cuisine).filter(Boolean) as string[]),
    ].sort(compareNames),
  );

  const filtered = $derived(
    restaurants
      .filter((r) => {
        if (showFavOnly && !r.is_fav) return false;
        if (activeCity !== "all" && r.city !== activeCity) return false;
        if (activeCuisine !== "all" && r.cuisine !== activeCuisine)
          return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const hay = [
            r.name,
            r.city,
            r.cuisine,
            r.dine_note,
            ...r.dishes.map((d) => d.name + " " + d.note),
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => compareNames(a.name, b.name)),
  );

  // ── Data loading ─────────────────────────────────────────────────────────
  async function loadRestaurants() {
    loading = true;
    error = undefined;
    const { data, error: err } = await supabase
      .from("restaurants")
      .select("*, dishes(*)")
      .order("created_at", { ascending: false });

    if (err) error = err.message;
    else restaurants = (data ?? []) as Restaurant[];
    loading = false;
  }

  onMount(() => {
    const init = async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      session = s;
      authLoading = false;
      if (s) loadRestaurants();
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      session = s;
      // Only clear data on sign-out; initial load is handled by onMount
      if (event === "SIGNED_OUT") {
        restaurants = [];
        loading = true;
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  });

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openAddModal() {
    editingRestaurant = undefined;
    showModal = true;
  }

  function openEditModal(r: Restaurant) {
    editingRestaurant = r;
    showModal = true;
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteRestaurant(id: number) {
    if (!confirm("确定要删除这条记录吗？")) return;
    const { error: err } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", id);
    if (err) error = err.message;
    else restaurants = restaurants.filter((r) => r.id !== id);
  }

  // ── Batch delete ──────────────────────────────────────────────────────────
  function toggleBatchMode() {
    batchMode = !batchMode;
    selectedIds = new Set();
  }

  function toggleSelect(id: number) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    selectedIds = s;
  }

  async function batchDelete() {
    const n = selectedIds.size;
    if (n === 0) return;
    if (!confirm(`确定删除选中的 ${n} 家餐厅吗？`)) return;
    const ids = [...selectedIds];
    const { error: err } = await supabase
      .from("restaurants")
      .delete()
      .in("id", ids);
    if (err) {
      error = err.message;
    } else {
      restaurants = restaurants.filter((r) => !ids.includes(r.id));
      batchMode = false;
      selectedIds = new Set();
    }
  }

  function selectAllFiltered() {
    const s = new Set(selectedIds);
    for (const r of filtered) s.add(r.id);
    selectedIds = s;
  }

  function deselectAllFiltered() {
    const s = new Set(selectedIds);
    for (const r of filtered) s.delete(r.id);
    selectedIds = s;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    downloadYaml(restaurants);
  }

  // ── Import ────────────────────────────────────────────────────────────────
  let importing = $state(false);
  let importErrors = $state<string[]>([]);
  let importCount = $state(0);
  let importMerged = $state(0);
  let importDone = $state(false);

  function triggerImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".yaml,.yml";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const { restaurants: parsed, errors } = parseYaml(text);
      importErrors = errors;
      if (parsed.length === 0) {
        importDone = true;
        importCount = 0;
        return;
      }
      importing = true;
      importDone = false;
      importCount = 0;
      importMerged = 0;
      let insertErrors: string[] = [...errors];
      for (const r of parsed) {
        const existing = restaurants.find(
          (e) => e.name === r.name && (e.city ?? null) === (r.city ?? null),
        );
        if (existing) {
          if (r.dishes.length > 0) {
            const { error: dishErr } = await supabase.from("dishes").insert(
              r.dishes.map((d) => ({
                restaurant_id: existing.id,
                name: d.name,
                dtype: d.dtype,
                rating: d.rating,
                price: d.price || null,
                note: d.note || null,
              })),
            );
            if (dishErr) {
              insertErrors = [
                ...insertErrors,
                `"${r.name}" dishes (merge): ${dishErr.message}`,
              ];
              continue;
            }
          }
          importMerged += 1;
          continue;
        }
        const { data: rest, error: restErr } = await supabase
          .from("restaurants")
          .insert({
            name: r.name,
            city: r.city || null,
            cuisine: r.cuisine || null,
            dine_type: r.dine_type,
            env_rating: r.env_rating,
            svc_rating: r.svc_rating,
            is_fav: r.is_fav,
            dine_note: r.dine_note || null,
          })
          .select()
          .single();
        if (restErr) {
          insertErrors = [...insertErrors, `"${r.name}": ${restErr.message}`];
          continue;
        }
        if (r.dishes.length > 0) {
          const { error: dishErr } = await supabase.from("dishes").insert(
            r.dishes.map((d) => ({
              restaurant_id: rest.id,
              name: d.name,
              dtype: d.dtype,
              rating: d.rating,
              price: d.price || null,
              note: d.note || null,
            })),
          );
          if (dishErr) {
            insertErrors = [
              ...insertErrors,
              `"${r.name}" dishes: ${dishErr.message}`,
            ];
          }
        }
        importCount += 1;
      }
      importErrors = insertErrors;
      importing = false;
      importDone = true;
      await loadRestaurants();
    };
    input.click();
  }

  function dismissImport() {
    importDone = false;
    importErrors = [];
    importCount = 0;
    importMerged = 0;
  }
</script>

{#if authLoading}
  <div class="auth-loading">加载中…</div>
{:else if !session}
  <LoginPage onSignIn={signIn} />
{:else}
  <div class="app">
    <div class="header">
      <h1>美食日记</h1>
      <div class="header-right">
        {#if batchMode}
          <button
            class="delete-batch-btn"
            onclick={batchDelete}
            disabled={selectedIds.size === 0}>删除 ({selectedIds.size})</button
          >
          <button class="tool-btn" onclick={toggleBatchMode}>取消</button>
        {:else}
          <button class="add-btn" onclick={openAddModal}>+ 添加餐厅</button>
          <button class="tool-btn" onclick={toggleBatchMode}>选择</button>
          <button
            class="tool-btn"
            onclick={handleExport}
            disabled={loading || restaurants.length === 0}>导出</button
          >
          <button class="tool-btn" onclick={triggerImport} disabled={importing}
            >{importing ? "导入中…" : "导入"}</button
          >
          <button class="signout-btn" onclick={signOut}>退出</button>
        {/if}
      </div>
    </div>

    {#if batchMode}
      <div class="batch-toolbar">
        <button class="batch-sel-btn" onclick={selectAllFiltered}>全选</button>
        <button class="batch-sel-btn" onclick={deselectAllFiltered}
          >取消全选</button
        >
        <span class="batch-count">{selectedIds.size} 已选</span>
      </div>
    {/if}

    <input
      class="search"
      type="text"
      placeholder="搜索餐厅或菜品…"
      bind:value={searchQuery}
    />

    <div class="chips">
      <button
        class="chip"
        class:active={showFavOnly}
        onclick={() => (showFavOnly = !showFavOnly)}>❤️ 心水</button
      >
    </div>

    <div class="chips">
      <button
        class="chip"
        class:active={activeCity === "all"}
        onclick={() => (activeCity = "all")}>全部</button
      >
      {#each cities as city}
        <button
          class="chip"
          class:active={activeCity === city}
          onclick={() => (activeCity = activeCity === city ? "all" : city)}
        >
          {getCityFlag(city)}
          {city}
        </button>
      {/each}
    </div>
    {#if cuisines.length > 0}
      <div class="chips">
        <button
          class="chip"
          class:active={activeCuisine === "all"}
          onclick={() => (activeCuisine = "all")}>全部</button
        >
        {#each cuisines as cuisine}
          <button
            class="chip"
            class:active={activeCuisine === cuisine}
            onclick={() =>
              (activeCuisine = activeCuisine === cuisine ? "all" : cuisine)}
            >{cuisine}</button
          >
        {/each}
      </div>
    {/if}

    {#if !loading && restaurants.length > 0}
      <div class="count">{filtered.length} 家餐厅</div>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}

    {#if loading}
      <p class="empty">加载中…</p>
    {:else if filtered.length === 0}
      <p class="empty">
        {restaurants.length === 0
          ? "还没有记录，点击右上角开始添加 🥢"
          : "没有找到匹配的结果"}
      </p>
    {:else}
      <div class="grid">
        {#each filtered as r (r.id)}
          <RestaurantCard
            restaurant={r}
            {batchMode}
            selected={selectedIds.has(r.id)}
            onToggleSelect={() => toggleSelect(r.id)}
            onEdit={() => openEditModal(r)}
            onDelete={() => deleteRestaurant(r.id)}
          />
        {/each}
      </div>
    {/if}
  </div>
{/if}

{#if showModal}
  <RestaurantModal
    restaurantToEdit={editingRestaurant}
    {cities}
    {cuisines}
    onClose={() => (showModal = false)}
    onSaved={loadRestaurants}
  />
{/if}

{#if importDone}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div role="presentation" class="overlay" onclick={dismissImport}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="import-result" onclick={(e) => e.stopPropagation()}>
      <div class="import-result-title">导入完成</div>
      {#if importCount > 0 || importMerged > 0}
        {#if importCount > 0}
          <p class="import-ok">新增 {importCount} 家餐厅</p>
        {/if}
        {#if importMerged > 0}
          <p class="import-ok">合并菜品至 {importMerged} 家已有餐厅</p>
        {/if}
      {:else}
        <p class="import-none">没有餐厅被导入</p>
      {/if}
      {#if importErrors.length > 0}
        <div class="import-errors">
          <div class="import-errors-title">警告 / 错误</div>
          {#each importErrors as e}
            <div class="import-error-row">{e}</div>
          {/each}
        </div>
      {/if}
      <button class="add-btn" onclick={dismissImport}>关闭</button>
    </div>
  </div>
{/if}

<style>
  .app {
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: system-ui, sans-serif;
  }
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .header h1 {
    font-size: 19px;
    font-weight: 500;
  }
  .header-right {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .add-btn {
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
  }
  .delete-batch-btn {
    background: #c0392b;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
  }
  .delete-batch-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .signout-btn {
    background: none;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    cursor: pointer;
    color: #888;
  }
  .tool-btn {
    background: none;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    cursor: pointer;
    color: #444;
  }
  .tool-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .import-result {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    min-width: 300px;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .import-result-title {
    font-size: 17px;
    font-weight: 600;
  }
  .import-ok {
    color: #27ae60;
    font-size: 15px;
    margin: 0;
  }
  .import-none {
    color: #888;
    font-size: 15px;
    margin: 0;
  }
  .import-errors {
    background: #fdecea;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .import-errors-title {
    font-size: 13px;
    font-weight: 600;
    color: #c0392b;
    margin-bottom: 6px;
  }
  .import-error-row {
    font-size: 13px;
    color: #c0392b;
    line-height: 1.6;
  }
  .auth-loading {
    text-align: center;
    padding: 80px 20px;
    font-family: system-ui, sans-serif;
    color: #999;
  }
  .search {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 15px;
    margin-bottom: 10px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-bottom: 4px;
    margin-bottom: 16px;
  }
  .chip {
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 13px;
    border: 1px solid #d0d0d0;
    background: #fff;
    color: #666;
    cursor: pointer;
    white-space: nowrap;
  }
  .chip.active {
    background: #1a1a1a;
    color: #fff;
    border-color: #1a1a1a;
  }
  .count {
    font-size: 13px;
    color: #888;
    margin-bottom: 12px;
  }
  .empty {
    text-align: center;
    padding: 56px 20px;
    color: #999;
    font-size: 15px;
  }
  .error {
    color: #c0392b;
    padding: 8px 12px;
    background: #fdecea;
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
    gap: 12px;
  }
  @media (min-width: 900px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  .batch-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .batch-sel-btn {
    background: none;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 13px;
    cursor: pointer;
    color: #444;
  }
  .batch-sel-btn:hover {
    background: #f5f5f5;
  }
  .batch-count {
    font-size: 13px;
    color: #888;
    margin-left: 4px;
  }
</style>
