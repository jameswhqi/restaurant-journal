<script lang="ts">
  let {
    onSignIn,
  }: {
    onSignIn: (email: string, password: string) => Promise<string | undefined>;
  } = $props();

  let email = $state("");
  let password = $state("");
  let error = $state<string | undefined>(undefined);
  let loading = $state(false);

  async function handleSubmit() {
    loading = true;
    error = undefined;
    error = await onSignIn(email, password);
    loading = false;
  }
</script>

<div class="login-wrap">
  <div class="login-box">
    <h1>美食日记</h1>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <input
        type="email"
        bind:value={email}
        placeholder="邮箱"
        required
        autocomplete="email"
      />
      <input
        type="password"
        bind:value={password}
        placeholder="密码"
        required
        autocomplete="current-password"
      />
      {#if error}<p class="login-error">{error}</p>{/if}
      <button type="submit" disabled={loading}>
        {loading ? "登录中…" : "登录"}
      </button>
    </form>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, sans-serif;
    background: #f5f5f5;
  }
  .login-box {
    background: #fff;
    border-radius: 14px;
    padding: 32px;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  }
  .login-box h1 {
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 24px;
    text-align: center;
  }
  .login-box form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .login-box input {
    padding: 10px 12px;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
  }
  .login-box button {
    padding: 12px;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
  }
  .login-box button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .login-error {
    color: #c0392b;
    font-size: 13px;
    background: #fdecea;
    padding: 8px 12px;
    border-radius: 8px;
  }
</style>
