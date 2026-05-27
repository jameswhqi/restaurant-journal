<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { cn } from "$lib/utils.js";

  let {
    value = $bindable(""),
    options,
    placeholder = "",
  }: {
    value: string;
    options: string[];
    placeholder?: string;
  } = $props();

  let open = $state(false);
  let search = $state("");

  const showCreate = $derived(
    search.trim() !== "" && !options.some((o) => o === search.trim()),
  );

  function select(opt: string) {
    value = opt;
    search = "";
    open = false;
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class={cn(
      "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background",
      "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
    )}
    role="combobox"
    aria-expanded={open}
  >
    <span class={value ? "" : "text-muted-foreground"}>
      {value || placeholder}
    </span>
    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
  </Popover.Trigger>
  <Popover.Content class="w-[--bits-popover-anchor-width] p-0" align="start">
    <Command.Root>
      <Command.Input bind:value={search} placeholder="搜索…" />
      <Command.List>
        <Command.Empty>
          {#if showCreate}
            <button
              type="button"
              class="w-full px-2 py-1.5 text-sm text-left hover:bg-accent"
              onclick={() => select(search.trim())}
            >
              新增「{search.trim()}」
            </button>
          {:else}
            无匹配结果
          {/if}
        </Command.Empty>
        <Command.Group>
          {#each options as opt}
            <Command.Item value={opt} onSelect={() => select(opt)}>
              <Check
                class={cn(
                  "mr-2 h-4 w-4",
                  value === opt ? "opacity-100" : "opacity-0",
                )}
              />
              {opt}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
