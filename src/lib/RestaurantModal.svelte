<script lang="ts">
  import { untrack } from "svelte";
  import { supabase } from "./supabase";
  import type { Restaurant, DineType } from "./database.types";
  import {
    dineLabel,
    ratingEmoji,
    CURRENCIES,
    CURRENCY_SYMBOL,
    toEur,
    type Currency,
  } from "./utils";
  import Combobox from "./Combobox.svelte";

  let {
    restaurantToEdit,
    cities,
    cuisines,
    onClose,
    onSaved,
  }: {
    restaurantToEdit: Restaurant | undefined;
    cities: string[];
    cuisines: string[];
    onClose: () => void;
    onSaved: () => void;
  } = $props();

  const r = untrack(() => restaurantToEdit);
  const isEditing = r !== undefined;

  // ── Form state initialised from restaurantToEdit (or blank for add) ──────
  let fName = $state(r?.name ?? "");
  let fCity = $state(r?.city ?? "");
  let fCuisine = $state(r?.cuisine ?? "");
  let fDineType = $state<DineType[]>(r ? (r.dine_type as DineType[]) : []);
  let fEnvRating = $state(r?.env_rating ?? 0);
  let fSvcRating = $state(r?.svc_rating ?? 0);
  let fDineNote = $state(r?.dine_note ?? "");
  let fIsFav = $state(r?.is_fav ?? false);
  let fCurrency = $state<Currency>((r?.currency as Currency) ?? "EUR");
  let fDishes = $state(
    r?.dishes?.length
      ? r.dishes.map((d) => ({
          name: d.name,
          price: d.price ?? "",
          rating: d.rating ?? 0,
          dtype: (d.dtype ?? "main") as "main" | "dessert" | "drink",
          note: d.note ?? "",
        }))
      : [{ name: "", price: "", rating: 0, dtype: "main" as const, note: "" }],
  );

  let saving = $state(false);
  let saveError = $state<string | undefined>(undefined);
  let validationError = $state<string | undefined>(undefined);

  function addDish() {
    fDishes = [
      ...fDishes,
      { name: "", price: "", rating: 0, dtype: "main", note: "" },
    ];
  }

  function removeDish(i: number) {
    fDishes = fDishes.filter((_, idx) => idx !== i);
  }

  async function saveRecord() {
    // Validate all required fields
    validationError = undefined;

    if (!fCity.trim()) {
      validationError = "城市为必填项";
      return;
    }
    if (!fName.trim()) {
      validationError = "餐厅名称为必填项";
      return;
    }
    if (!fCuisine.trim()) {
      validationError = "菜系为必填项";
      return;
    }
    if (fDineType.length === 0) {
      validationError = "请至少选择一种用餐方式";
      return;
    }
    if (fEnvRating === 0) {
      validationError = "环境评分为必填项";
      return;
    }
    if (fSvcRating === 0) {
      validationError = "服务评分为必填项";
      return;
    }
    if (!fDineNote.trim()) {
      validationError = "整体印象为必填项";
      return;
    }

    // Validate dishes - all present dishes must be complete
    if (fDishes.length === 0) {
      validationError = "请至少添加一道菜品";
      return;
    }

    const validDishes = [];
    for (let i = 0; i < fDishes.length; i++) {
      const d = fDishes[i];
      const hasName = d.name.trim() !== "";
      const hasRating = d.rating !== 0;
      const hasNote = d.note.trim() !== "";

      // Name, rating, and note are required; price is optional
      if (!hasName) {
        validationError = `第 ${i + 1} 道菜品缺少菜名`;
        return;
      }
      if (!hasRating) {
        validationError = `第 ${i + 1} 道菜品缺少评分`;
        return;
      }
      if (!hasNote) {
        validationError = `第 ${i + 1} 道菜品缺少备注`;
        return;
      }
      validDishes.push(d);
    }

    saving = true;
    saveError = undefined;

    if (isEditing && r) {
      // ── Update restaurant ────────────────────────────────────────────────
      const { error: restErr } = await supabase
        .from("restaurants")
        .update({
          name: fName.trim(),
          city: fCity.trim() || null,
          cuisine: fCuisine.trim() || null,
          dine_type: fDineType,
          env_rating: fEnvRating,
          svc_rating: fSvcRating,
          dine_note: fDineNote.trim() || null,
          is_fav: fIsFav,
          currency: fCurrency,
        })
        .eq("id", r.id);

      if (restErr) {
        saveError = restErr.message;
        saving = false;
        return;
      }

      // ── Replace dishes: delete then re-insert ────────────────────────────
      const { error: delErr } = await supabase
        .from("dishes")
        .delete()
        .eq("restaurant_id", r.id);

      if (delErr) {
        saveError = delErr.message;
        saving = false;
        return;
      }

      if (validDishes.length > 0) {
        const { error: dishErr } = await supabase.from("dishes").insert(
          validDishes.map((d) => ({
            restaurant_id: r.id,
            name: d.name.trim(),
            price: d.price.trim() || null,
            rating: d.rating,
            dtype: d.dtype,
            note: d.note.trim() || null,
          })),
        );
        if (dishErr) {
          saveError = dishErr.message;
          saving = false;
          return;
        }
      }
    } else {
      // ── Insert new restaurant ─────────────────────────────────────────────
      const { data: rest, error: restErr } = await supabase
        .from("restaurants")
        .insert({
          name: fName.trim(),
          city: fCity.trim() || null,
          cuisine: fCuisine.trim() || null,
          dine_type: fDineType,
          env_rating: fEnvRating,
          svc_rating: fSvcRating,
          dine_note: fDineNote.trim() || null,
          is_fav: fIsFav,
          currency: fCurrency,
          visit_count: 1,
        })
        .select()
        .single();

      if (restErr) {
        saveError = restErr.message;
        saving = false;
        return;
      }

      if (validDishes.length > 0) {
        const { error: dishErr } = await supabase.from("dishes").insert(
          validDishes.map((d) => ({
            restaurant_id: rest.id,
            name: d.name.trim(),
            price: d.price.trim() || null,
            rating: d.rating,
            dtype: d.dtype,
            note: d.note.trim() || null,
          })),
        );
        if (dishErr) {
          saveError = dishErr.message;
          saving = false;
          return;
        }
      }
    }

    saving = false;
    onSaved();
    onClose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="presentation"
  class="overlay"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
  <div class="modal">
    <div class="modal-title">{isEditing ? "编辑餐厅记录" : "添加餐厅记录"}</div>

    <div class="form-grid">
      <label>
        城市
        <Combobox bind:value={fCity} options={cities} />
      </label>
      <label>
        餐厅名称
        <input bind:value={fName} />
      </label>
      <label>
        菜系
        <Combobox bind:value={fCuisine} options={cuisines} />
      </label>
      <div class="pseudo-label">
        用餐方式
        <div class="seg">
          {#each ["dine", "take", "delivery"] as DineType[] as t}
            <button
              class="seg-btn"
              class:sel={fDineType.includes(t)}
              onclick={() => {
                if (fDineType.includes(t)) {
                  fDineType = fDineType.filter((x) => x !== t);
                } else {
                  fDineType = [...fDineType, t];
                }
              }}>{dineLabel[t]}</button
            >
          {/each}
        </div>
      </div>
      <div class="pseudo-label">
        环境评分
        <div class="picker">
          {#each [0, 1, 2, 3] as v}
            <button
              class="pick-btn"
              class:sel={fEnvRating === v}
              onclick={() => (fEnvRating = v)}
              >{v === 0 ? "—" : "🥢".repeat(v)}</button
            >
          {/each}
        </div>
      </div>
      <div class="pseudo-label">
        服务评分
        <div class="picker">
          {#each [0, 1, 2, 3] as v}
            <button
              class="pick-btn"
              class:sel={fSvcRating === v}
              onclick={() => (fSvcRating = v)}
              >{v === 0 ? "—" : "🥢".repeat(v)}</button
            >
          {/each}
        </div>
      </div>
      <label class="full">
        整体印象
        <input bind:value={fDineNote} placeholder="如：装修很好，服务一般" />
      </label>
      <div class="pseudo-label">
        心水餐厅
        <div class="seg">
          <button
            class="seg-btn"
            class:sel={!fIsFav}
            onclick={() => (fIsFav = false)}>不选</button
          >
          <button
            class="seg-btn"
            class:sel={fIsFav}
            onclick={() => (fIsFav = true)}>是 ❤️</button
          >
        </div>
      </div>
      <div class="pseudo-label">
        货币
        <div class="currency-seg">
          {#each CURRENCIES as c}
            <button
              class="pick-btn currency-btn"
              class:sel={fCurrency === c}
              onclick={() => (fCurrency = c)}>{c}</button
            >
          {/each}
        </div>
      </div>
    </div>

    <div class="section-label">菜品</div>
    {#each fDishes as dish, i}
      <div class="dish-entry">
        <div class="dish-fields">
          <div class="dish-name-price">
            <input
              bind:value={dish.name}
              placeholder="菜名"
              class="dish-name"
            />
            <div class="price-wrap">
              <div class="price-input-row">
                <span class="price-symbol">{CURRENCY_SYMBOL[fCurrency]}</span>
                <input
                  bind:value={dish.price}
                  placeholder="价格（可选）"
                  class="dish-price"
                />
              </div>
              {#if fCurrency !== "EUR"}
                <span class="price-conv" class:price-conv-hidden={!dish.price}
                  >≈ {toEur(dish.price, fCurrency)}</span
                >
              {/if}
            </div>
          </div>
          <div class="dish-types">
            <button
              class="dtype-btn"
              class:sel={dish.dtype === "main"}
              onclick={() => (dish.dtype = "main")}>🥢 主菜</button
            >
            <button
              class="dtype-btn"
              class:sel={dish.dtype === "dessert"}
              onclick={() => (dish.dtype = "dessert")}>🍮 甜品</button
            >
            <button
              class="dtype-btn"
              class:sel={dish.dtype === "drink"}
              onclick={() => (dish.dtype = "drink")}>🍻 饮品</button
            >
          </div>
          <div class="picker">
            {#each [-1, 0, 1, 2, 3, 4] as v}
              <button
                class="pick-btn"
                class:sel={dish.rating === v}
                onclick={() => (dish.rating = v)}
              >
                {v === -1
                  ? "💣"
                  : v === 0
                    ? "—"
                    : (dish.dtype === "dessert"
                        ? "🍮"
                        : dish.dtype === "drink"
                          ? "🍻"
                          : "🥢"
                      ).repeat(v)}
              </button>
            {/each}
          </div>
          <input bind:value={dish.note} placeholder="备注" class="note-input" />
        </div>
        <button class="remove-dish" onclick={() => removeDish(i)}>✕</button>
      </div>
    {/each}
    <button class="add-dish-btn" onclick={addDish}>+ 添加菜品</button>

    {#if validationError}
      <p class="validation-error">{validationError}</p>
    {/if}
    {#if saveError}
      <p class="save-error">{saveError}</p>
    {/if}

    <div class="btn-row">
      <button class="btn-cancel" onclick={onClose}>取消</button>
      <button class="btn-primary" onclick={saveRecord} disabled={saving}>
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 50;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 24px 16px;
    overflow-y: auto;
  }
  .modal {
    background: #fff;
    border-radius: 14px;
    padding: 24px;
    width: min(640px, calc(100vw - 32px));
  }
  .modal-title {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 18px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #666;
  }
  .form-grid label.full {
    grid-column: 1 / -1;
  }
  .form-grid input {
    padding: 9px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
  }
  .seg {
    display: flex;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    overflow: hidden;
  }
  .seg-btn {
    flex: 1;
    padding: 9px 4px;
    font-size: 13px;
    cursor: pointer;
    border: none;
    border-right: 1px solid #d0d0d0;
    background: #fff;
    color: #666;
  }
  .seg-btn:last-child {
    border-right: none;
  }
  .seg-btn.sel {
    background: #1a1a1a;
    color: #fff;
  }
  .picker {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pick-btn {
    padding: 6px 10px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    background: #fff;
    color: #666;
  }
  .pick-btn.sel {
    background: #1a1a1a;
    color: #fff;
    border-color: #1a1a1a;
  }
  .section-label {
    font-size: 13px;
    font-weight: 500;
    margin: 20px 0 8px;
  }
  .dish-entry {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    background: #f7f7f7;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    align-items: start;
  }
  .dish-fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .dish-name-price {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .dish-name-price .dish-name {
    flex: 2;
    min-width: 120px;
  }
  .dish-name-price .dish-price {
    width: 100%;
  }
  .price-wrap {
    flex: 1;
    min-width: 80px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .price-input-row {
    display: flex;
    align-items: center;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  .price-symbol {
    padding: 0 6px 0 10px;
    font-size: 13px;
    color: #888;
    white-space: nowrap;
    user-select: none;
  }
  .price-input-row .dish-price {
    border: none;
    border-radius: 0;
    padding-left: 0;
    flex: 1;
    min-width: 0;
  }
  .price-input-row .dish-price:focus {
    outline: none;
    box-shadow: none;
  }
  .price-conv {
    font-size: 11px;
    color: #888;
    padding-left: 2px;
    line-height: 1.2;
  }
  .price-conv-hidden {
    visibility: hidden;
  }
  .pseudo-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #666;
  }
  .currency-seg {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .currency-btn {
    font-size: 11px;
    padding: 5px 8px;
  }
  .dish-fields input {
    padding: 8px 10px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 13px;
  }
  .dish-types {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .dtype-btn {
    padding: 6px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    background: #fff;
    color: #666;
  }
  .dtype-btn.sel {
    background: #1a1a1a;
    color: #fff;
    border-color: #1a1a1a;
  }
  .remove-dish {
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    color: #aaa;
    padding: 8px 4px;
    line-height: 1;
  }
  .add-dish-btn {
    width: 100%;
    padding: 9px;
    border: 1px dashed #d0d0d0;
    border-radius: 8px;
    background: none;
    font-size: 13px;
    color: #888;
    cursor: pointer;
    margin-top: 4px;
  }
  .save-error {
    color: #c0392b;
    font-size: 13px;
    background: #fdecea;
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 12px;
  }
  .validation-error {
    color: #d68910;
    font-size: 13px;
    background: #fef5e7;
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 12px;
  }
  .btn-row {
    display: flex;
    gap: 8px;
    margin-top: 20px;
  }
  .btn-primary {
    flex: 1;
    padding: 12px;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-cancel {
    padding: 12px 16px;
    background: none;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    color: #666;
  }
</style>
