function printVol() {
  // Hide UI elements
  document.querySelector('.vol-search-wrap').style.display = 'none';
  document.querySelector('.vol-filter-row').style.display = 'none';

  // Build a clean print table
  const cards = document.querySelectorAll('.vol-card');

  let tableHTML = `
    <h2>E-Sagip Volunteer Database</h2>
    <table style="width:100%; border-collapse:collapse; font-family:Arial; font-size:13px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #ccc; padding:8px;">Name</th>
          <th style="border:1px solid #ccc; padding:8px;">Status</th>
          <th style="border:1px solid #ccc; padding:8px;">Address</th>
          <th style="border:1px solid #ccc; padding:8px;">Contact Number</th>
        </tr>
      </thead>
      <tbody>
  `;

  cards.forEach(card => {
    const name = card.querySelector('.vol-name')?.childNodes[0]?.textContent.trim() || '';
    const status = card.querySelector('.vol-badge')?.textContent.trim() || '';
    const meta = card.querySelector('.vol-meta')?.textContent.trim() || '';

    // Split address and contact by " · "
    const [address, contact] = meta.split(' · ');

    tableHTML += `
      <tr>
        <td style="border:1px solid #ccc; padding:8px;">${name}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${status}</td>
        <td style="border:1px solid #ccc; padding:8px;">${address || ''}</td>
        <td style="border:1px solid #ccc; padding:8px;">${contact || ''}</td>
      </tr>
    `;
  });

  tableHTML += `</tbody></table>`;

  const original = document.body.innerHTML;
  document.body.innerHTML = tableHTML;
  window.print();

  setTimeout(() => {
    document.body.innerHTML = original;
    location.reload();
  }, 1000);
}

function printLog() {
  const cards = document.querySelectorAll('.recent-op-card');

  let tableHTML = `
    <h2 style="font-family:Arial; margin-bottom:16px;">E-Sagip Operation Database</h2>
    <table style="width:100%; border-collapse:collapse; font-family:Arial; font-size:13px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #ccc; padding:8px;">Title</th>
          <th style="border:1px solid #ccc; padding:8px;">Date</th>
          <th style="border:1px solid #ccc; padding:8px;">Location</th>
          <th style="border:1px solid #ccc; padding:8px;">Volunteers</th>
          <th style="border:1px solid #ccc; padding:8px;">Families Helped</th>
        </tr>
      </thead>
      <tbody>
  `;

  cards.forEach(card => {
    const title      = card.querySelector('.recent-op-name')?.textContent.trim() || '';
    const date       = card.querySelector('.recent-op-date')?.textContent.trim() || '';
    const location   = card.querySelector('.recent-op-loc')?.textContent.trim() || '';
    const volunteers = card.querySelector('.badge-vol')?.textContent.trim() || '';
    const families   = card.querySelector('.badge-helped')?.textContent.trim() || '';

    tableHTML += `
      <tr>
        <td style="border:1px solid #ccc; padding:8px;">${title}</td>
        <td style="border:1px solid #ccc; padding:8px;">${date}</td>
        <td style="border:1px solid #ccc; padding:8px;">${location}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${volunteers}</td>
        <td style="border:1px solid #ccc; padding:8px; text-align:center;">${families}</td>
      </tr>
    `;
  });

  tableHTML += `</tbody></table>`;

  const original = document.body.innerHTML;
  document.body.innerHTML = tableHTML;
  window.print();

  setTimeout(() => {
    document.body.innerHTML = original;
    location.reload();
  }, 1000);
}
