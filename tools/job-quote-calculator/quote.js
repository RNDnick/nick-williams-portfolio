(function () {
  var BUSINESS_KEY = 'nw-job-quote-calculator-business-v1';

  var businessNameInput = document.getElementById('business-name');
  var businessContactInput = document.getElementById('business-contact');
  var clientNameInput = document.getElementById('client-name');
  var jobDescriptionInput = document.getElementById('job-description');
  var quoteRefInput = document.getElementById('quote-ref');
  var quoteDateInput = document.getElementById('quote-date');
  var validDaysInput = document.getElementById('valid-days');

  var linesContainer = document.getElementById('quote-lines');
  var addLineBtn = document.getElementById('add-line-btn');

  var markupPercentInput = document.getElementById('markup-percent');
  var depositPercentInput = document.getElementById('deposit-percent');
  var vatEnabledCheckbox = document.getElementById('vat-enabled');
  var vatRateGroup = document.getElementById('vat-rate-group');
  var vatPercentInput = document.getElementById('vat-percent');
  var quoteNotesInput = document.getElementById('quote-notes');

  var previewEl = document.getElementById('quote-preview');
  var copyBtn = document.getElementById('copy-quote-btn');
  var printBtn = document.getElementById('print-quote-btn');

  var lineItems = [];

  function newId() {
    return 'l-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function toDateKey(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateDisplay(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function roundMoney(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(n) {
    return '£' + roundMoney(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Business details are the only thing persisted — no quote data is saved.
  function loadBusinessDetails() {
    try {
      var raw = localStorage.getItem(BUSINESS_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return {
        businessName: typeof parsed.businessName === 'string' ? parsed.businessName : '',
        contactDetails: typeof parsed.contactDetails === 'string' ? parsed.contactDetails : ''
      };
    } catch (e) {
      return null;
    }
  }

  function saveBusinessDetails() {
    try {
      localStorage.setItem(BUSINESS_KEY, JSON.stringify({
        businessName: businessNameInput.value,
        contactDetails: businessContactInput.value
      }));
    } catch (e) {}
  }

  function createLineRow(item) {
    var row = document.createElement('div');
    row.className = 'quote-line-row';
    row.setAttribute('data-id', item.id);

    var descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = 'Description';
    descInput.value = item.description;
    descInput.addEventListener('input', function () {
      item.description = descInput.value;
      renderPreview();
    });

    var qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '0';
    qtyInput.step = '0.5';
    qtyInput.value = String(item.qty);
    qtyInput.addEventListener('input', function () {
      item.qty = Number(qtyInput.value) || 0;
      updateAmount();
      renderPreview();
    });

    var priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.min = '0';
    priceInput.step = '0.01';
    priceInput.value = String(item.unitPrice);
    priceInput.addEventListener('input', function () {
      item.unitPrice = Number(priceInput.value) || 0;
      updateAmount();
      renderPreview();
    });

    var amountEl = document.createElement('div');
    amountEl.className = 'quote-line-amount';

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'quote-line-remove';
    removeBtn.setAttribute('aria-label', 'Remove line');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', function () { removeLine(item.id); });

    function updateAmount() {
      amountEl.textContent = formatMoney(item.qty * item.unitPrice);
    }
    updateAmount();

    row.appendChild(descInput);
    row.appendChild(qtyInput);
    row.appendChild(priceInput);
    row.appendChild(amountEl);
    row.appendChild(removeBtn);
    return row;
  }

  function addLine() {
    var item = { id: newId(), description: '', qty: 1, unitPrice: 0 };
    lineItems.push(item);
    linesContainer.appendChild(createLineRow(item));
    renderPreview();
  }

  function removeLine(id) {
    lineItems = lineItems.filter(function (item) { return item.id !== id; });
    var row = linesContainer.querySelector('[data-id="' + id + '"]');
    if (row) row.remove();
    renderPreview();
  }

  function computeTotals() {
    var subtotal = lineItems.reduce(function (sum, item) { return sum + item.qty * item.unitPrice; }, 0);
    var markupPercent = Number(markupPercentInput.value) || 0;
    var markupAmount = subtotal * markupPercent / 100;
    var subtotalWithMarkup = subtotal + markupAmount;

    var vatEnabled = vatEnabledCheckbox.checked;
    var vatPercent = vatEnabled ? (Number(vatPercentInput.value) || 0) : 0;
    var vatAmount = vatEnabled ? subtotalWithMarkup * vatPercent / 100 : 0;

    var total = subtotalWithMarkup + vatAmount;

    var depositPercent = Number(depositPercentInput.value) || 0;
    var depositDue = depositPercent > 0 ? total * depositPercent / 100 : 0;
    var balanceDue = depositPercent > 0 ? total - depositDue : 0;

    return {
      subtotal: subtotal,
      markupPercent: markupPercent,
      markupAmount: markupAmount,
      subtotalWithMarkup: subtotalWithMarkup,
      vatEnabled: vatEnabled,
      vatPercent: vatPercent,
      vatAmount: vatAmount,
      total: total,
      depositPercent: depositPercent,
      depositDue: depositDue,
      balanceDue: balanceDue
    };
  }

  function validUntilDate() {
    var base = quoteDateInput.value ? new Date(quoteDateInput.value + 'T00:00:00') : new Date();
    if (isNaN(base.getTime())) base = new Date();
    var days = Number(validDaysInput.value) || 30;
    base.setDate(base.getDate() + days);
    return toDateKey(base);
  }

  function renderPreview() {
    var totals = computeTotals();
    previewEl.textContent = '';

    var header = document.createElement('div');
    header.className = 'qp-header';

    var fromCol = document.createElement('div');
    var nameEl = document.createElement('div');
    nameEl.className = 'qp-business-name';
    nameEl.textContent = businessNameInput.value.trim() || 'Your business name';
    var contactEl = document.createElement('div');
    contactEl.className = 'qp-business-contact';
    contactEl.textContent = businessContactInput.value.trim();
    fromCol.appendChild(nameEl);
    fromCol.appendChild(contactEl);

    var metaCol = document.createElement('div');
    metaCol.className = 'qp-meta';
    var titleEl = document.createElement('div');
    titleEl.className = 'qp-title';
    titleEl.textContent = 'QUOTE';
    var refEl = document.createElement('div');
    refEl.textContent = 'Ref: ' + (quoteRefInput.value.trim() || '—');
    var dateEl = document.createElement('div');
    dateEl.textContent = 'Date: ' + formatDateDisplay(quoteDateInput.value || toDateKey(new Date()));
    var validEl = document.createElement('div');
    validEl.textContent = 'Valid until: ' + formatDateDisplay(validUntilDate());
    metaCol.appendChild(titleEl);
    metaCol.appendChild(refEl);
    metaCol.appendChild(dateEl);
    metaCol.appendChild(validEl);

    header.appendChild(fromCol);
    header.appendChild(metaCol);
    previewEl.appendChild(header);

    var clientBlock = document.createElement('div');
    clientBlock.className = 'qp-client';
    var clientLabel = document.createElement('div');
    clientLabel.className = 'qp-client-label';
    clientLabel.textContent = 'Quote for';
    var clientName = document.createElement('div');
    clientName.className = 'qp-client-name';
    clientName.textContent = clientNameInput.value.trim() || 'Client name';
    var jobDesc = document.createElement('div');
    jobDesc.className = 'qp-job-desc';
    jobDesc.textContent = jobDescriptionInput.value.trim();
    clientBlock.appendChild(clientLabel);
    clientBlock.appendChild(clientName);
    clientBlock.appendChild(jobDesc);
    previewEl.appendChild(clientBlock);

    var table = document.createElement('table');
    table.className = 'qp-table';
    var thead = document.createElement('thead');
    var headRow = document.createElement('tr');
    ['Description', 'Qty', 'Unit price', 'Amount'].forEach(function (label) {
      var th = document.createElement('th');
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    lineItems.forEach(function (item) {
      var tr = document.createElement('tr');
      var tdDesc = document.createElement('td');
      tdDesc.textContent = item.description || '—';
      var tdQty = document.createElement('td');
      tdQty.textContent = String(item.qty);
      var tdPrice = document.createElement('td');
      tdPrice.textContent = formatMoney(item.unitPrice);
      var tdAmount = document.createElement('td');
      tdAmount.textContent = formatMoney(item.qty * item.unitPrice);
      tr.appendChild(tdDesc);
      tr.appendChild(tdQty);
      tr.appendChild(tdPrice);
      tr.appendChild(tdAmount);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    previewEl.appendChild(table);

    var totalsBlock = document.createElement('div');
    totalsBlock.className = 'qp-totals';

    function totalsRow(label, value, extraClass) {
      var row = document.createElement('div');
      row.className = 'qp-totals-row' + (extraClass ? ' ' + extraClass : '');
      var l = document.createElement('span');
      l.textContent = label;
      var v = document.createElement('span');
      v.textContent = value;
      row.appendChild(l);
      row.appendChild(v);
      totalsBlock.appendChild(row);
    }

    totalsRow('Subtotal', formatMoney(totals.subtotal), 'no-print');
    totalsRow('Markup (' + totals.markupPercent + '%)', formatMoney(totals.markupAmount), 'no-print');
    totalsRow('Subtotal', formatMoney(totals.subtotalWithMarkup), 'print-only');
    if (totals.vatEnabled) {
      totalsRow('VAT (' + totals.vatPercent + '%)', formatMoney(totals.vatAmount));
    }
    totalsRow('Total', formatMoney(totals.total), 'qp-total');
    if (totals.depositPercent > 0) {
      totalsRow('Deposit due (' + totals.depositPercent + '%)', formatMoney(totals.depositDue), 'qp-deposit');
      totalsRow('Balance on completion', formatMoney(totals.balanceDue), 'qp-deposit');
    }
    previewEl.appendChild(totalsBlock);

    var notesText = quoteNotesInput.value.trim();
    var footer = document.createElement('div');
    footer.className = 'qp-footer';
    footer.textContent = 'This quote is valid until ' + formatDateDisplay(validUntilDate()) + '.' + (notesText ? '\n' + notesText : '');
    previewEl.appendChild(footer);
  }

  function buildQuoteText() {
    var totals = computeTotals();
    var lines = [];
    lines.push(businessNameInput.value.trim() || 'Your business name');
    if (businessContactInput.value.trim()) lines.push(businessContactInput.value.trim());
    lines.push('');
    lines.push('QUOTE');
    lines.push('Ref: ' + (quoteRefInput.value.trim() || '—'));
    lines.push('Date: ' + formatDateDisplay(quoteDateInput.value || toDateKey(new Date())));
    lines.push('Valid until: ' + formatDateDisplay(validUntilDate()));
    lines.push('');
    lines.push('Quote for: ' + (clientNameInput.value.trim() || 'Client name'));
    if (jobDescriptionInput.value.trim()) lines.push(jobDescriptionInput.value.trim());
    lines.push('');
    lineItems.forEach(function (item) {
      lines.push((item.description || '—') + ' — ' + item.qty + ' x ' + formatMoney(item.unitPrice) + ' = ' + formatMoney(item.qty * item.unitPrice));
    });
    lines.push('');
    lines.push('Subtotal: ' + formatMoney(totals.subtotalWithMarkup));
    if (totals.vatEnabled) lines.push('VAT (' + totals.vatPercent + '%): ' + formatMoney(totals.vatAmount));
    lines.push('Total: ' + formatMoney(totals.total));
    if (totals.depositPercent > 0) {
      lines.push('Deposit due (' + totals.depositPercent + '%): ' + formatMoney(totals.depositDue));
      lines.push('Balance on completion: ' + formatMoney(totals.balanceDue));
    }
    lines.push('');
    lines.push('This quote is valid until ' + formatDateDisplay(validUntilDate()) + '.');
    var notesText = quoteNotesInput.value.trim();
    if (notesText) lines.push(notesText);
    return lines.join('\n') + '\n';
  }

  // Init
  var saved = loadBusinessDetails();
  if (saved) {
    businessNameInput.value = saved.businessName;
    businessContactInput.value = saved.contactDetails;
  }
  quoteDateInput.value = toDateKey(new Date());
  quoteRefInput.value = 'Q-' + toDateKey(new Date()).replace(/-/g, '');

  [businessNameInput, businessContactInput].forEach(function (el) {
    el.addEventListener('input', function () { saveBusinessDetails(); renderPreview(); });
  });
  [clientNameInput, jobDescriptionInput, quoteRefInput, quoteDateInput, validDaysInput,
    markupPercentInput, depositPercentInput, vatPercentInput, quoteNotesInput].forEach(function (el) {
    el.addEventListener('input', renderPreview);
  });

  vatEnabledCheckbox.addEventListener('change', function () {
    vatRateGroup.hidden = !vatEnabledCheckbox.checked;
    renderPreview();
  });

  addLineBtn.addEventListener('click', addLine);

  copyBtn.addEventListener('click', function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(buildQuoteText()).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = original; }, 1500);
    }).catch(function () {});
  });

  printBtn.addEventListener('click', function () { window.print(); });

  addLine();
  addLine();
})();
