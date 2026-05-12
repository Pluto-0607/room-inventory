(function enablePasswordAuth() {
  const form = document.querySelector("#loginForm");
  const email = document.querySelector("#emailInput");
  const password = document.querySelector("#passwordInput");
  const signup = document.querySelector("#signupBtn");
  const status = document.querySelector("#syncStatus");

  if (!form || !email || !password || !window.supabase) return;

  const client = window.supabase.createClient(
    "https://uliflnwuorjuldlcibnp.supabase.co",
    "sb_publishable_am2Py8DVUyPT32JwoBLTVg_b9Q8OAZw",
  );

  const setStatus = (text, mode = "neutral") => {
    if (!status) return;
    status.textContent = text;
    status.dataset.mode = mode;
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    const { error } = await client.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });
    if (error) {
      window.alert(`登录失败：${error.message}`);
      return;
    }
    setStatus("登录成功，正在同步...", "ok");
    window.location.reload();
  };

  if (signup) {
    signup.onclick = async () => {
      if (!email.value.trim() || !password.value) {
        window.alert("请先填写邮箱和密码。");
        return;
      }
      const { data, error } = await client.auth.signUp({
        email: email.value.trim(),
        password: password.value,
        options: { emailRedirectTo: window.location.href.split("#")[0] },
      });
      if (error) {
        window.alert(`注册失败：${error.message}`);
        return;
      }
      if (data.session) {
        setStatus("注册成功，正在同步...", "ok");
        window.location.reload();
        return;
      }
      setStatus("注册成功，请按邮箱提示完成确认", "ok");
    };
  }
})();
