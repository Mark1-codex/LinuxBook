(function () {
  const cfg = window.DISTRO_PAGE_CONFIG || {};
  const distroId = cfg.id || window.location.pathname.split("/").filter(Boolean).pop();

  const checkboxes = Array.from(document.querySelectorAll(".step-check input[type='checkbox']"));
  checkboxes.forEach((box, idx) => {
    box.addEventListener("change", async () => {
      if (!distroId) return;
      try {
        const res = await fetch(`/api/checklist/${encodeURIComponent(distroId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step_index: idx, checked: box.checked }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("Checklist save failed:", err);
      }
    });
  });

  const saveBtn = document.getElementById("save-notes-btn");
  const notesInput = document.getElementById("distro-notes-input");
  const statusEl = document.getElementById("note-status");

  if (saveBtn && notesInput && distroId) {
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      if (statusEl) statusEl.textContent = "Saving...";
      try {
        const res = await fetch(`/api/note/${encodeURIComponent(distroId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: notesInput.value }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (statusEl) statusEl.textContent = "Saved to SQLite.";
      } catch (err) {
        console.error("Note save failed:", err);
        if (statusEl) statusEl.textContent = "Failed to save note.";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }

  document.querySelectorAll(".copy-cmd-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const codeEl = btn.parentElement ? btn.parentElement.querySelector("code") : null;
      if (!codeEl) return;
      try {
        await navigator.clipboard.writeText(codeEl.textContent || "");
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.textContent = prev || "Copy";
        }, 1200);
      } catch (_) {
        btn.textContent = "Error";
      }
    });
  });
})();