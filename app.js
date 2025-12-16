window.onload = function () {

  const supabaseUrl = "https://natiuzdebpqhjjrtjiqo.supabase.co";
  const supabaseKey = "sb_publishable_CX3fwp7vwAG6cn_Qu_UAnw_7i55ZWX1";

  const container = document.getElementById("charList");

  const supabase = window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  );

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

  supabase
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

  async function init() {
    const chars = await loadChar();
    chars.forEach(buildCard);
  }

  init();
};
