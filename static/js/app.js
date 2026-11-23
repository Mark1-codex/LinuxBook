(function () {
  const list = typeof DISTROS !== "undefined" && Array.isArray(DISTROS) ? DISTROS : [];
  const grid = document.getElementById("distro-grid");
  const meta = document.getElementById("results-meta");
  const searchInput = document.getElementById("search-input");
  const levelSelect = document.getElementById("level-select");
  const familyBar = document.getElementById("family-filters");

  let activeFamily = "all";

  function renderCards(items) {
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = "<p>No matching distributions found.</p>";
      if (meta) meta.textContent = "Showing 0 of " + list.length + " distributions";
      return;
    }
    grid.innerHTML = items.map((d) => `
      <article class="distro-card">
        <div>
          <div class="card-top">
            <h3 class="card-title">${d.name}</h3>
            <span class="level-tag">${d.level}</span>
          </div>
          <p class="card-summary" style="margin-top:8px;">${d.summary}</p>
        </div>
        <div>
          <div class="card-meta" style="margin-bottom:10px;">
            <span>pkg: ${d.pkg}</span>
            <span>init: ${d.init}</span>
          </div>
          <a class="open-guide-btn" href="${d.detailUrl}">Open ${d.name} guide</a>
        </div>
      </article>
    `).join("");
    if (meta) {
      meta.textContent = "Showing " + items.length + " of " + list.length + " distributions";
    }
  }

  function applyFilters() {
    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const lvl = levelSelect ? levelSelect.value : "all";
    const filtered = list.filter((d) => {
      if (activeFamily !== "all" && d.family !== activeFamily) return false;
      if (lvl !== "all" && d.level !== lvl) return false;
      if (!q) return true;
      const hay = [
        d.name, d.family, d.level, d.pkg, d.init, d.installer, d.summary, d.cmd
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
    renderCards(filtered);
  }

  if (familyBar) {
    familyBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      activeFamily = btn.dataset.family || "all";
      familyBar.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    });
  }
  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (levelSelect) levelSelect.addEventListener("change", applyFilters);

  renderCards(list);
})();