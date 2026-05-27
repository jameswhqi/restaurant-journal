<script lang="ts">
  import type { Restaurant, DineType } from "./database.types";
  import { ratingEmoji, dineLabel } from "./utils";

  let {
    restaurant: r,
    onEdit,
    onDelete,
  }: {
    restaurant: Restaurant;
    onEdit: () => void;
    onDelete: () => void;
  } = $props();
</script>

<div class="card" class:fav={r.is_fav}>
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

  {#if r.dishes?.length}
    <div class="dishes">
      {#each r.dishes as d (d.id)}
        <div class="dish">
          <span class="dish-name">{d.name}</span>
          <span class="dish-right">
            {#if d.price}<span class="dish-price">€{d.price}</span>{/if}
            <span>{ratingEmoji(d.rating, d.dtype as "main" | "dessert")}</span>
          </span>
          {#if d.note}<div class="dish-note">{d.note}</div>{/if}
        </div>
      {/each}
    </div>
  {/if}

  <div class="card-footer">
    <span class="label">{dineLabel[(r.dine_type ?? "dine") as DineType]}</span>
    {#if r.dine_note}<span class="dine-note">{r.dine_note}</span>{/if}
    <div class="card-actions">
      <button class="action-btn edit-btn" onclick={onEdit}>编辑</button>
      <button class="action-btn delete-btn" onclick={onDelete}>删除</button>
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
  .card.fav {
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
    font-size: 15px;
    font-weight: 500;
  }
  .rest-sub {
    font-size: 12px;
    color: #888;
    margin-top: 2px;
  }
  .ratings {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    font-size: 11px;
    color: #888;
  }
  .dishes {
    padding: 6px 14px 10px;
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
    font-size: 13px;
    flex: 1;
  }
  .dish-right {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: #888;
  }
  .dish-price {
    font-size: 12px;
    color: #888;
  }
  .dish-note {
    font-size: 11px;
    color: #aaa;
    width: 100%;
  }
  .card-footer {
    padding: 7px 14px;
    font-size: 12px;
    color: #888;
    border-top: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .label {
    color: #bbb;
  }
  .dine-note {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    font-size: 11px;
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
</style>
