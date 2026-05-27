<script lang="ts">
  import { onMount } from "svelte";
  import { supabase } from "./lib/supabase";
  import type { Restaurant } from "./lib/database.types";
  import type { Session } from "@supabase/supabase-js";
  import LoginPage from "./lib/LoginPage.svelte";
  import RestaurantCard from "./lib/RestaurantCard.svelte";
  import RestaurantModal from "./lib/RestaurantModal.svelte";

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
  let showModal = $state(false);
  let editingRestaurant = $state<Restaurant | undefined>(undefined);

  // ── Derived ──────────────────────────────────────────────────────────────
  const cities = $derived([
    ...new Set(restaurants.map((r) => r.city).filter(Boolean) as string[]),
  ]);

  const cuisines = $derived([
    ...new Set(restaurants.map((r) => r.cuisine).filter(Boolean) as string[]),
  ]);

  const filtered = $derived(
    restaurants.filter((r) => {
      if (activeCity === "fav" && !r.is_fav) return false;
      if (activeCity !== "all" && activeCity !== "fav" && r.city !== activeCity)
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
    }),
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

  onMount(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    session = s;
    authLoading = false;
    if (s) loadRestaurants();

    supabase.auth.onAuthStateChange((_event, s) => {
      session = s;
      if (s) loadRestaurants();
      else {
        restaurants = [];
        loading = true;
      }
    });
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
        <button class="add-btn" onclick={openAddModal}>+ 添加餐厅</button>
        <button class="signout-btn" onclick={signOut}>退出</button>
      </div>
    </div>

    <input
      class="search"
      type="text"
      placeholder="搜索餐厅或菜品…"
      bind:value={searchQuery}
    />

    <div class="chips">
      <button
        class="chip"
        class:active={activeCity === "all"}
        onclick={() => (activeCity = "all")}>全部</button
      >
      <button
        class="chip"
        class:active={activeCity === "fav"}
        onclick={() => (activeCity = "fav")}>❤️ 心水</button
      >
      {#each cities as city}
        <button
          class="chip"
          class:active={activeCity === city}
          onclick={() => (activeCity = city)}>{city}</button
        >
      {/each}
    </div>

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

<style>
  .app {
    padding: 16px;
    max-width: 860px;
    margin: 0 auto;
    font-family: system-ui, sans-serif;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 500;
  }
  .header-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .add-btn {
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
  }
  .signout-btn {
    background: none;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    color: #888;
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
    font-size: 14px;
    margin-bottom: 10px;
  }
  .chips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
    margin-bottom: 16px;
  }
  .chip {
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 12px;
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
  .empty {
    text-align: center;
    padding: 56px 20px;
    color: #999;
    font-size: 14px;
  }
  .error {
    color: #c0392b;
    padding: 8px 12px;
    background: #fdecea;
    border-radius: 8px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
</style>
