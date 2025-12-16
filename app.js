window.onload = function () {

  const supabaseUrl = "https://natiuzdebpqhjjrtjiqo.supabase.co";
  const supabaseKey = "sb_publishable_CX3fwp7vwAG6cn_Qu_UAnw_7i55ZWX1";
  let realtimeChannel = null;


  const container = document.getElementById("charList");
  const filters = document.getElementById("filters");
  const searchBar = document.getElementById("searchBar");

  const supabase = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );

  supabase.auth.getSession().then(({ data }) => {
    updateAuthUI(data.session);
  });


  function updateAuthUI(session) {
    const authBox = document.getElementById("authBox");
    const logoutBtn = document.getElementById("logoutBtn");
    const resetSection = document.getElementById("resetSection");

    if (session) {
      authBox.style.display = "none";
      logoutBtn.style.display = "block";
      resetSection.style.display = "block";
    } else {
      authBox.style.display = "block";
      logoutBtn.style.display = "none";
      resetSection.style.display = "none";
    }
  }

  async function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if(!error) {
      window.location.reload();
    }
  }

  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("logoutBtn").addEventListener("click", logout);


  async function logout() {
    await supabase.auth.signOut();
  }



  async function loadChar() {
    const { data, error } = await supabase
      .from("char")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  }

  const buildCard = (chars) => {
    const card = document.createElement("div");
    const image = document.createElement("img");
    const name = document.createElement("p");

    card.className = "card";
    if (chars.dead) card.classList.add("dead");

    card.dataset.id = chars.id;
    card.dataset.dead = chars.dead;
    card.dataset.name = chars.name.toLowerCase();
    card.dataset.series = chars.series.toLowerCase();

    card.addEventListener("click", click);

    image.src = chars.image || "https://placehold.co/100";
    image.className = "charImage";

    name.textContent = chars.name;
    name.className = "charName";

    card.appendChild(image);
    card.appendChild(name);

    container.appendChild(card);
  };

  const click = async (e) => {
    const card = e.currentTarget;

    if (card.dataset.loading === "true") return;
    card.dataset.loading = "true";

    const id = card.dataset.id;
    const currentDead = card.dataset.dead === "true";

    const { error } = await supabase
      .from("char")
      .update({ dead: !currentDead })
      .eq("id", id);

    if (error) {
      console.error("Update failed:", error);
    }

    card.dataset.loading = "false";
  };

  const getCardById = (id) => {
    return container.querySelector(`.card[data-id="${id}"]`);
  };

  const applyUpdate = (row) => {
    const card = getCardById(row.id);
    if (!card) return;

    const wasDead = card.dataset.dead === "true";
    const isDead = row.dead;

    if (wasDead !== isDead) {
      card.classList.toggle("dead", isDead);
      card.dataset.dead = isDead;
    }
  };

  const filterCards = (filter) => {
    const cards = container.querySelectorAll(".card");

    cards.forEach((card) => {
      const isDead = card.dataset.dead === "true";

      if (filter === "all") {
        card.style.display = "flex";
      } else if (filter === "alive" && isDead) {
        card.style.display = "none";
      } else if (filter === "dead" && !isDead) {
        card.style.display = "none";
      } else {
        card.style.display = "flex";
      }
    });
  };


  const searchCards = (query) => {
    const cards = container.querySelectorAll(".card");
    const lowerCaseQuery = query.toLowerCase();

    cards.forEach((card) => {
      const name = card.dataset.name;
      const series = card.dataset.series;

      if (name.includes(lowerCaseQuery) || series.includes(lowerCaseQuery)) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  };

  searchBar.addEventListener("input", (e) => {
    const query = e.target.value;
    searchCards(query);
  });

  filters.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      const filter = e.target.dataset.filter;
      filterCards(filter);
    }
  });

  let initialSessionLoaded = false;

  supabase.auth.getSession().then(({ data }) => {
    initialSessionLoaded = true;
    init();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    updateAuthUI(session);

    if (event === "SIGNED_IN" && !initialSessionLoaded) {
      initialSessionLoaded = true;
      init();
    }

    if (event === "SIGNED_OUT") {
      initialSessionLoaded = false;
      container.innerHTML = "";
      unsubscribeRealtime();
    }
  });


  document.getElementById("resetBtn").addEventListener("click", async () => {
  const email = document.getElementById("reset-email").value;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://guigolbr.github.io/smashlocke/reset.html"
  });


  document.getElementById("resetStatus").textContent =
    error ? error.message : "Password reset email sent!";
  });




  function subscribeRealtime() {
  if (realtimeChannel) return;

  realtimeChannel = supabase
      .channel("char-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "char",
        },
        (payload) => {
          applyUpdate(payload.new);
        }
      )
      .subscribe();
  }

  function unsubscribeRealtime() {
    if (!realtimeChannel) return;

    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  let initialized = false;

  async function init() {
    if (initialized) return;
    initialized = true;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    container.innerHTML = "";
    const chars = await loadChar();
    chars.forEach(buildCard);

    subscribeRealtime();
  }

  init();
};
