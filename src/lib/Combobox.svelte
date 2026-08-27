<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import Copy from "@lucide/svelte/icons/copy";
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
  let copied = $state(false);

  const showCreate = $derived(
    search.trim() !== "" && !options.some((o) => o === search.trim()),
  );

  function select(opt: string) {
    value = opt;
    search = "";
    open = false;
  }

  async function copyToClipboard() {
    const text = options.join(", ");
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class={cn(
      "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-base shadow-xs ring-offset-background",
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
      {#if options.length > 0}
        <div class="px-2 py-1.5 border-b">
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onclick={copyToClipboard}
          >
            <Copy class="h-3 w-3" />
            {copied ? "已复制" : "复制全部"}
          </button>
        </div>
      {/if}
      <Command.List>
        <Command.Empty>无匹配结果</Command.Empty>
        <Command.Group>
          {#if showCreate}
            <Command.Item
              value={search.trim()}
              onSelect={() => select(search.trim())}
            >
              <span class="text-muted-foreground mr-2">+</span>
              新增「{search.trim()}」
            </Command.Item>
          {/if}
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
