<script lang="ts">
  import type { Restaurant, DineType } from "./database.types";
  import { ratingEmoji, dineLabels, compareNames } from "./utils";

  let {
    restaurant: r,
    batchMode = false,
    selected = false,
    onToggleSelect,
    onEdit,
    onDelete,
  }: {
    restaurant: Restaurant;
    batchMode?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    onEdit: () => void;
    onDelete: () => void;
  } = $props();
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
        {[r.city, r.cuisine].filter(Boolean).join(" · ")}
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
      {#each [...r.dishes].sort( (a, b) => compareNames(a.name, b.name), ) as d (d.id)}
        <div class="dish">
          <span class="dish-name">{d.name}</span>
          <span class="dish-right">
            {#if d.price}<span class="dish-price">€{d.price}</span>{/if}
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
    font-size: 16px;
    font-weight: 500;
  }
  .rest-sub {
    font-size: 13px;
    color: #888;
    margin-top: 2px;
  }
  .ratings {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    font-size: 12px;
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
    font-size: 14px;
    flex: 1;
  }
  .dish-right {
    display: flex;
    gap: 8px;
    font-size: 13px;
    color: #888;
  }
  .dish-price {
    font-size: 13px;
    color: #888;
  }
  .dish-note {
    font-size: 13px;
    color: #888;
    width: 100%;
  }
  .card-meta {
    padding: 6px 14px;
    font-size: 13px;
    color: #888;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .card-footer {
    padding: 7px 14px;
    font-size: 13px;
    color: #888;
    border-top: 1px solid #f0f0f0;
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
    font-size: 12px;
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
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1.5px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #fff;
    flex-shrink: 0;
  }
  .check-circle.checked {
    background: #c0392b;
    border-color: #c0392b;
  }
</style>
