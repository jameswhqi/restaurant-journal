<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from './lib/supabase'
  import type { Restaurant, DineType } from './lib/database.types'
  import type { Session } from '@supabase/supabase-js'

  // ── Auth state ───────────────────────────────────────────────────────────
  let session = $state<Session | null>(null)
  let authLoading = $state(true)
  let loginEmail = $state('')
  let loginPassword = $state('')
  let loginError = $state<string | null>(null)
  let loginLoading = $state(false)

  async function signIn() {
    loginLoading = true
    loginError = null
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) loginError = error.message
    loginLoading = false
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // ── State ────────────────────────────────────────────────────────────────
  let restaurants: Restaurant[] = $state([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let searchQuery = $state('')
  let activeCity = $state('all')
  let showModal = $state(false)
  let saving = $state(false)

  // ── Form state ───────────────────────────────────────────────────────────
  let fName = $state('')
  let fCity = $state('')
  let fCuisine = $state('')
  let fDineType = $state<DineType>('dine')
  let fEnvRating = $state(0)
  let fSvcRating = $state(0)
  let fDineNote = $state('')
  let fIsFav = $state(false)
  let fDishes = $state<Array<{ name: string; price: string; rating: number; dtype: 'main' | 'dessert'; note: string }>>([])

  const CUISINES = ['日式', '中式', '意大利菜', '印度菜', '墨西哥菜', '地中海菜', '法式', '泰式', '美式', '其他']
  const dineLabel: Record<DineType, string> = { dine: 'Dine In', take: 'Take Out', delivery: 'Delivery' }

  // ── Derived ──────────────────────────────────────────────────────────────
  const cities = $derived([...new Set(restaurants.map(r => r.city).filter(Boolean) as string[])])

  const filtered = $derived(restaurants.filter(r => {
    if (activeCity === 'fav' && !r.is_fav) return false
    if (activeCity !== 'all' && activeCity !== 'fav' && r.city !== activeCity) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const hay = [r.name, r.city, r.cuisine, r.dine_note, ...r.dishes.map(d => d.name + ' ' + d.note)].join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }))

  // ── Data loading ─────────────────────────────────────────────────────────
  async function loadRestaurants() {
    loading = true
    error = null
    const { data, error: err } = await supabase
      .from('restaurants')
      .select('*, dishes(*)')
      .order('created_at', { ascending: false })

    if (err) { error = err.message }
    else { restaurants = (data ?? []) as Restaurant[] }
    loading = false
  }

  onMount(async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    session = s
    authLoading = false
    if (s) loadRestaurants()

    supabase.auth.onAuthStateChange((_event, s) => {
      session = s
      if (s) loadRestaurants()
      else { restaurants = []; loading = true }
    })
  })

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openModal() {
    fName = ''; fCity = ''; fCuisine = ''; fDineType = 'dine'
    fEnvRating = 0; fSvcRating = 0; fDineNote = ''; fIsFav = false
    fDishes = [{ name: '', price: '', rating: 0, dtype: 'main', note: '' }]
    showModal = true
  }

  function addDish() {
    fDishes = [...fDishes, { name: '', price: '', rating: 0, dtype: 'main', note: '' }]
  }

  function removeDish(i: number) {
    fDishes = fDishes.filter((_, idx) => idx !== i)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveRecord() {
    if (!fName.trim()) return
    saving = true

    const { data: rest, error: restErr } = await supabase
      .from('restaurants')
      .insert({
        name: fName.trim(),
        city: fCity.trim() || null,
        cuisine: fCuisine.trim() || null,
        dine_type: fDineType,
        env_rating: fEnvRating,
        svc_rating: fSvcRating,
        dine_note: fDineNote.trim() || null,
        is_fav: fIsFav,
      } as any)
      .select()
      .single()

    if (restErr) { error = restErr.message; saving = false; return }

    const validDishes = fDishes.filter(d => d.name.trim())
    if (validDishes.length > 0) {
      const { error: dishErr } = await supabase.from('dishes').insert(
        validDishes.map(d => ({
          restaurant_id: (rest as any).id,
          name: d.name.trim(),
          price: d.price.trim() || null,
          rating: d.rating,
          dtype: d.dtype,
          note: d.note.trim() || null,
        })) as any
      )
      if (dishErr) { error = dishErr.message; saving = false; return }
    }

    saving = false
    showModal = false
    await loadRestaurants()
  }

  function ratingEmoji(n: number, dtype: 'main' | 'dessert') {
    if (!n) return '—'
    return (dtype === 'dessert' ? '🍮' : '🥢').repeat(n)
  }
</script>

{#if authLoading}
  <div class="auth-loading">加载中…</div>
{:else if !session}
  <div class="login-wrap">
    <div class="login-box">
      <h1>美食日记</h1>
      <form onsubmit={(e) => { e.preventDefault(); signIn() }}>
        <input type="email" bind:value={loginEmail} placeholder="邮箱" required autocomplete="email" />
        <input type="password" bind:value={loginPassword} placeholder="密码" required autocomplete="current-password" />
        {#if loginError}<p class="login-error">{loginError}</p>{/if}
        <button type="submit" disabled={loginLoading}>{loginLoading ? '登录中…' : '登录'}</button>
      </form>
    </div>
  </div>
{:else}
<div class="app">
  <div class="header">
    <h1>美食日记</h1>
    <div class="header-right">
      <button class="add-btn" onclick={openModal}>+ 添加餐厅</button>
      <button class="signout-btn" onclick={signOut}>退出</button>
    </div>
  </div>

  <input class="search" type="text" placeholder="搜索餐厅或菜品…" bind:value={searchQuery} />

  <div class="chips">
    <button class="chip" class:active={activeCity === 'all'} onclick={() => activeCity = 'all'}>全部</button>
    <button class="chip" class:active={activeCity === 'fav'} onclick={() => activeCity = 'fav'}>❤️ 心水</button>
    {#each cities as city}
      <button class="chip" class:active={activeCity === city} onclick={() => activeCity = city}>{city}</button>
    {/each}
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if loading}
    <p class="empty">加载中…</p>
  {:else if filtered.length === 0}
    <p class="empty">{restaurants.length === 0 ? '还没有记录，点击右上角开始添加 🥢' : '没有找到匹配的结果'}</p>
  {:else}
    <div class="grid">
      {#each filtered as r (r.id)}
        <div class="card" class:fav={r.is_fav}>
          <div class="card-header">
            <div>
              <div class="rest-name">{r.is_fav ? '❤️ ' : ''}{r.name}</div>
              <div class="rest-sub">{[r.city, r.cuisine].filter(Boolean).join(' · ')}</div>
            </div>
            <div class="ratings">
              {#if r.env_rating}<span>环境 {ratingEmoji(r.env_rating, 'main')}</span>{/if}
              {#if r.svc_rating}<span>服务 {ratingEmoji(r.svc_rating, 'main')}</span>{/if}
            </div>
          </div>
          {#if r.dishes?.length}
            <div class="dishes">
              {#each r.dishes as d (d.id)}
                <div class="dish">
                  <span class="dish-name">{d.name}</span>
                  <span class="dish-right">
                    {#if d.price}<span class="dish-price">€{d.price}</span>{/if}
                    <span>{ratingEmoji(d.rating, d.dtype)}</span>
                  </span>
                  {#if d.note}<div class="dish-note">{d.note}</div>{/if}
                </div>
              {/each}
            </div>
          {/if}
          <div class="card-footer">
            <span class="label">{dineLabel[r.dine_type ?? 'dine']}</span>
            {#if r.dine_note}<span>{r.dine_note}</span>{/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div><!-- end .app -->
{/if}

<!-- Modal -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div role="presentation" class="overlay" onclick={(e) => { if (e.target === e.currentTarget) showModal = false }}>
    <div class="modal">
      <div class="modal-title">添加餐厅记录</div>

      <div class="form-grid">
        <label>城市
          <input bind:value={fCity} placeholder="如：Amsterdam" list="city-list" />
          <datalist id="city-list">{#each cities as c}<option value={c}></option>{/each}</datalist>
        </label>
        <label>餐厅名称
          <input bind:value={fName} placeholder="如：Takumi" />
        </label>
        <label>菜系
          <input bind:value={fCuisine} placeholder="如：日式" list="cuisine-list" />
          <datalist id="cuisine-list">{#each CUISINES as c}<option value={c}></option>{/each}</datalist>
        </label>
        <label>用餐方式
          <div class="seg">
            {#each (['dine', 'take', 'delivery'] as DineType[]) as t}
              <button class="seg-btn" class:sel={fDineType === t} onclick={() => fDineType = t}>{dineLabel[t]}</button>
            {/each}
          </div>
        </label>
        <label>环境评分
          <div class="picker">
            {#each [0,1,2,3] as v}
              <button class="pick-btn" class:sel={fEnvRating === v} onclick={() => fEnvRating = v}>{v === 0 ? '—' : '🥢'.repeat(v)}</button>
            {/each}
          </div>
        </label>
        <label>服务评分
          <div class="picker">
            {#each [0,1,2,3] as v}
              <button class="pick-btn" class:sel={fSvcRating === v} onclick={() => fSvcRating = v}>{v === 0 ? '—' : '🥢'.repeat(v)}</button>
            {/each}
          </div>
        </label>
        <label class="full">整体印象
          <input bind:value={fDineNote} placeholder="如：装修很好，服务一般" />
        </label>
        <label class="full">心水餐厅
          <div class="seg">
            <button class="seg-btn" class:sel={fIsFav} onclick={() => fIsFav = true}>是 ❤️</button>
            <button class="seg-btn" class:sel={!fIsFav} onclick={() => fIsFav = false}>不选</button>
          </div>
        </label>
      </div>

      <div class="section-label">菜品</div>
      {#each fDishes as dish, i}
        <div class="dish-entry">
          <input bind:value={dish.name} placeholder="菜名" />
          <input bind:value={dish.price} placeholder="价格" />
          <div class="dish-types">
            <button class="dtype-btn" class:sel={dish.dtype === 'main'} onclick={() => dish.dtype = 'main'}>🥢 主菜</button>
            <button class="dtype-btn" class:sel={dish.dtype === 'dessert'} onclick={() => dish.dtype = 'dessert'}>🍮 甜品</button>
          </div>
          <div class="picker">
            {#each [0,1,2,3,4] as v}
              <button class="pick-btn" class:sel={dish.rating === v} onclick={() => dish.rating = v}>
                {v === 0 ? '—' : (dish.dtype === 'dessert' ? '🍮' : '🥢').repeat(v)}
              </button>
            {/each}
          </div>
          <input bind:value={dish.note} placeholder="备注（可选）" class="note-input" />
          <button class="remove-dish" onclick={() => removeDish(i)}>✕</button>
        </div>
      {/each}
      <button class="add-dish-btn" onclick={addDish}>+ 添加菜品</button>

      <div class="btn-row">
        <button class="btn-cancel" onclick={() => showModal = false}>取消</button>
        <button class="btn-primary" onclick={saveRecord} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .app { padding: 16px; max-width: 860px; margin: 0 auto; font-family: system-ui, sans-serif; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .header h1 { font-size: 18px; font-weight: 500; }
  .header-right { display: flex; gap: 8px; align-items: center; }
  .add-btn { background: #1a1a1a; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
  .signout-btn { background: none; border: 1px solid #d0d0d0; border-radius: 8px; padding: 8px 12px; font-size: 13px; cursor: pointer; color: #888; }
  .auth-loading { text-align: center; padding: 80px 20px; font-family: system-ui, sans-serif; color: #999; }
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; background: #f5f5f5; }
  .login-box { background: #fff; border-radius: 14px; padding: 32px; width: 100%; max-width: 360px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
  .login-box h1 { font-size: 20px; font-weight: 500; margin-bottom: 24px; text-align: center; }
  .login-box form { display: flex; flex-direction: column; gap: 12px; }
  .login-box input { padding: 10px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; }
  .login-box button { padding: 12px; background: #1a1a1a; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
  .login-box button:disabled { opacity: 0.5; cursor: not-allowed; }
  .login-error { color: #c0392b; font-size: 13px; background: #fdecea; padding: 8px 12px; border-radius: 8px; }
  .search { width: 100%; padding: 8px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; margin-bottom: 10px; }
  .chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 16px; }
  .chip { padding: 5px 14px; border-radius: 20px; font-size: 12px; border: 1px solid #d0d0d0; background: #fff; color: #666; cursor: pointer; white-space: nowrap; }
  .chip.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
  .empty { text-align: center; padding: 56px 20px; color: #999; font-size: 14px; }
  .error { color: #c0392b; padding: 8px 12px; background: #fdecea; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; }
  .card.fav { border: 1.5px solid #c0392b; }
  .card-header { padding: 12px 14px 10px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; gap: 8px; }
  .rest-name { font-size: 15px; font-weight: 500; }
  .rest-sub { font-size: 12px; color: #888; margin-top: 2px; }
  .ratings { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-size: 11px; color: #888; }
  .dishes { padding: 6px 14px 10px; }
  .dish { padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .dish:last-child { border-bottom: none; }
  .dish { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px; }
  .dish-name { font-size: 13px; flex: 1; }
  .dish-right { display: flex; gap: 8px; font-size: 12px; color: #888; }
  .dish-price { font-size: 12px; color: #888; }
  .dish-note { font-size: 11px; color: #aaa; width: 100%; }
  .card-footer { padding: 7px 14px; font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; display: flex; gap: 8px; }
  .label { color: #bbb; }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 50; display: flex; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
  .modal { background: #fff; border-radius: 14px; padding: 24px; width: 100%; max-width: 640px; }
  .modal-title { font-size: 16px; font-weight: 500; margin-bottom: 18px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #666; }
  .form-grid label.full { grid-column: 1 / -1; }
  .form-grid input { padding: 9px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; }
  .seg { display: flex; border: 1px solid #d0d0d0; border-radius: 8px; overflow: hidden; }
  .seg-btn { flex: 1; padding: 9px 4px; font-size: 13px; cursor: pointer; border: none; border-right: 1px solid #d0d0d0; background: #fff; color: #666; }
  .seg-btn:last-child { border-right: none; }
  .seg-btn.sel { background: #1a1a1a; color: #fff; }
  .picker { display: flex; gap: 6px; flex-wrap: wrap; }
  .pick-btn { padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 13px; cursor: pointer; background: #fff; color: #666; }
  .pick-btn.sel { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }

  .section-label { font-size: 13px; font-weight: 500; margin: 20px 0 8px; }
  .dish-entry { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; background: #f7f7f7; border-radius: 8px; padding: 12px; margin-bottom: 8px; position: relative; }
  .dish-entry input { padding: 8px 10px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 13px; }
  .dish-types { grid-column: 1 / -1; display: flex; gap: 6px; }
  .dtype-btn { padding: 6px 12px; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 12px; cursor: pointer; background: #fff; color: #666; }
  .dtype-btn.sel { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
  .note-input { grid-column: 1 / -1; }
  .remove-dish { position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 14px; cursor: pointer; color: #aaa; }
  .add-dish-btn { width: 100%; padding: 9px; border: 1px dashed #d0d0d0; border-radius: 8px; background: none; font-size: 13px; color: #888; cursor: pointer; margin-top: 4px; }

  .btn-row { display: flex; gap: 8px; margin-top: 20px; }
  .btn-primary { flex: 1; padding: 12px; background: #1a1a1a; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-cancel { padding: 12px 16px; background: none; border: 1px solid #d0d0d0; border-radius: 8px; font-size: 14px; cursor: pointer; color: #666; }
</style>
