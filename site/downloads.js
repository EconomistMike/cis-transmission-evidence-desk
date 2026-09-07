// Keep an ordinary click on JSON in the explorer: save bytes, do not navigate.
(() => {
  const link = document.getElementById('dl-json');
  if (!link) return;
  link.download = 'evidence-pack.json';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.style.cssText = 'font-size:12px;max-width:24rem;';
  link.parentElement.append(status);
  let pending = false;
  link.addEventListener('click', async event => {
    // Preserve explicit new-tab actions and the existing local-file fallback.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || location.protocol === 'file:') return;
    event.preventDefault();
    if (pending) return;
    pending = true;
    link.setAttribute('aria-busy', 'true');
    status.textContent = 'Preparing JSON download…';
    try {
      const response = await fetch(link.href, { credentials: 'omit' });
      if (!response.ok) throw new Error('Download request failed');
      const bytes = await response.arrayBuffer();
      // Reject host error pages rather than saving HTML with a JSON extension.
      const parsed = JSON.parse(new TextDecoder().decode(bytes));
      if (parsed.schema !== 'ate.project-evidence-pack.v2') throw new Error('Unexpected evidence format');
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const save = document.createElement('a');
      save.href = url;
      save.download = 'evidence-pack.json';
      document.body.append(save);
      save.click();
      save.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'JSON download started.';
    } catch {
      status.textContent = 'JSON download failed. Please try again.';
    } finally {
      pending = false;
      link.removeAttribute('aria-busy');
    }
  });
})();
