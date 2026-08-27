<script lang="ts">
  import type { Restaurant, DineType } from "./database.types";
  import {
    ratingEmoji,
    dineLabels,
    compareDishes,
    getCityFlag,
    displayPrice,
    type Currency,
  } from "./utils";

  let {
    restaurant: r,
    batchMode = false,
    selected = false,
    onToggleSelect,
    onEdit,
    onDelete,
    onIncrementVisit,
    onDecrementVisit,
  }: {
    restaurant: Restaurant;
    batchMode?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onIncrementVisit?: () => void;
    onDecrementVisit?: () => void;
  } = $props();

  let animating = $state(false);

  function handleIncrement() {
    onIncrementVisit?.();
    animating = true;
    setTimeout(() => (animating = false), 700);
  }

  function handleDecrement() {
    onDecrementVisit?.();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="card"
  class:fav={r.is_fav}
  class:selectable={batchMode}
  class:selected
  role={batchMode ? "checkbox" : undefined}
  aria-checked={batchMode ? selected : undefined}
  tabindex={batchMode ? 0 : undefined}
  onclick={batchMode ? onToggleSelect : undefined}
  onkeydown={batchMode
    ? (e) => {
        if (e.key === " " || e.key === "Enter") onToggleSelect?.();
      }
    : undefined}
>
  <div class="card-header">
    <div>
      <div class="rest-name">{r.is_fav ? "❤️ " : ""}{r.name}</div>
      <div class="rest-sub">
        {[
          getCityFlag(r.city) ? `${getCityFlag(r.city)} ${r.city}` : r.city,
          r.cuisine,
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>
    </div>
    <div class="ratings">
      {#if r.env_rating}<span>环境 {ratingEmoji(r.env_rating, "main")}</span
        >{/if}
      {#if r.svc_rating}<span>服务 {ratingEmoji(r.svc_rating, "main")}</span
        >{/if}
    </div>
  </div>

  <div class="card-meta">
    <span class="label"
      >{dineLabels(
        (r.dine_type?.length ? r.dine_type : ["dine"]) as DineType[],
      )}</span
    >
    {#if r.dine_note}<span class="dine-note">{r.dine_note}</span>{/if}
  </div>

  {#if r.dishes?.length}
    <div class="dishes">
      {#each [...r.dishes].sort(compareDishes) as d (d.id)}
        <div class="dish">
          <span class="dish-name">{d.name}</span>
          <span class="dish-right">
            {#if d.price}<span class="dish-price"
                >{displayPrice(
                  d.price,
                  (r.currency ?? "EUR") as Currency,
                )}</span
              >{/if}
            <span
              >{ratingEmoji(
                d.rating,
                d.dtype as "main" | "dessert" | "drink",
              )}</span
            >
          </span>
          {#if d.note}<div class="dish-note">{d.note}</div>{/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="card-footer">
    <div class="visit-counter">
      <span class="counter-label">去过</span>
      <button
        class="count-btn"
        onclick={handleDecrement}
        disabled={batchMode || (r.visit_count ?? 1) <= 1}
        aria-label="减少次数">−</button
      >
      <span class="visit-num" class:pop={animating}>{r.visit_count ?? 1}</span>
      <button
        class="count-btn"
        onclick={handleIncrement}
        disabled={batchMode}
        aria-label="增加次数">+</button
      >
      <span class="counter-label">次</span>
    </div>
    <div class="card-actions">
      {#if batchMode}
        <div class="check-circle" class:checked={selected}>
          {#if selected}✓{/if}
        </div>
      {:else}
        <button class="action-btn edit-btn" onclick={onEdit}>编辑</button>
        <button class="action-btn delete-btn" onclick={onDelete}>删除</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .card {
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .card.selectable {
    cursor: pointer;
  }
  .card.selected {
    border-color: #c0392b;
    box-shadow: 0 0 0 1px #c0392b;
  }
  .card.fav:not(.selectable) {
    border: 1.5px solid #c0392b;
  }
  .card-header {
    padding: 12px 14px 10px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .rest-name {
    font-size: 18px;
    font-weight: 500;
  }
  .rest-sub {
    font-size: 15px;
    color: #888;
    margin-top: 2px;
  }
  .ratings {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    font-size: 14px;
    color: #888;
  }
  .dishes {
    padding: 6px 14px 10px;
    max-height: 250px;
    overflow-y: auto;
  }
  .dish {
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }
  .dish:last-child {
    border-bottom: none;
  }
  .dish-name {
    font-size: 16px;
    flex: 1;
  }
  .dish-right {
    display: flex;
    gap: 8px;
    font-size: 15px;
    color: #888;
  }
  .dish-price {
    font-size: 15px;
    color: #888;
  }
  .dish-note {
    font-size: 15px;
    color: #888;
    width: 100%;
  }
  .card-meta {
    padding: 6px 14px;
    font-size: 15px;
    color: #888;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .card-footer {
    padding: 7px 14px;
    font-size: 15px;
    color: #888;
    border-top: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
  }
  .visit-counter {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .counter-label {
    font-size: 14px;
    color: #999;
  }
  .count-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid #d0d0d0;
    background: #f5f5f5;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #555;
    flex-shrink: 0;
  }
  .count-btn:hover:not(:disabled) {
    background: #e8e8e8;
  }
  .count-btn:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .visit-num {
    min-width: 22px;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    color: #444;
    display: inline-block;
    margin-inline: -2px;
  }
  @keyframes visit-pop {
    0% {
      transform: scale(1);
      color: #444;
    }
    20% {
      transform: scale(1.8);
      color: #e67e22;
    }
    40% {
      transform: scale(2.1) rotate(-8deg);
      color: #e74c3c;
    }
    55% {
      transform: scale(1.9) rotate(6deg);
      color: #9b59b6;
    }
    70% {
      transform: scale(1.5);
      color: #2980b9;
    }
    85% {
      transform: scale(1.2);
      color: #27ae60;
    }
    100% {
      transform: scale(1);
      color: #444;
    }
  }
  .visit-num.pop {
    animation: visit-pop 0.7s ease-in-out;
  }
  .label {
    color: #999;
  }
  .dine-note {
    white-space: normal;
    word-break: break-word;
  }
  .card-actions {
    margin-left: auto;
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .action-btn {
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid #e0e0e0;
    background: #fff;
  }
  .edit-btn {
    color: #555;
  }
  .edit-btn:hover {
    background: #f5f5f5;
  }
  .delete-btn {
    color: #c0392b;
    border-color: #f5c6c0;
  }
  .delete-btn:hover {
    background: #fdecea;
  }
  .check-circle {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1.5px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: #fff;
    flex-shrink: 0;
  }
  .check-circle.checked {
    background: #c0392b;
    border-color: #c0392b;
  }
</style>
