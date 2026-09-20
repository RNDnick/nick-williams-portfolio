(function () {
  var incomeInput = document.getElementById('income-input');
  var expensesInput = document.getElementById('expenses-input');
  var otherIncomeInput = document.getElementById('other-income-input');
  var regionSelect = document.getElementById('region-select');

  var profitLine = document.getElementById('tax-profit-line');
  var resultPersonalAllowance = document.getElementById('result-personal-allowance');
  var resultIncomeTax = document.getElementById('result-income-tax');
  var resultNi = document.getElementById('result-ni');
  var resultTotal = document.getElementById('result-total');
  var resultTakeHome = document.getElementById('result-take-home');
  var resultEffectiveRate = document.getElementById('result-effective-rate');
  var resultMonthly = document.getElementById('result-monthly');
  var class2Note = document.getElementById('class2-note');
  var copyBtn = document.getElementById('copy-summary-btn');

  var PERSONAL_ALLOWANCE = 12570;
  var TAPER_START = 100000;
  var TAPER_END = 125140;

  var NI_LOWER_PROFITS_LIMIT = 12570;
  var NI_UPPER_PROFITS_LIMIT = 50270;
  var NI_MAIN_RATE = 0.06;
  var NI_ADDITIONAL_RATE = 0.02;
  var SMALL_PROFITS_THRESHOLD = 6725;
  var VOLUNTARY_CLASS2_ANNUAL = 179.40;

  var REGIONS = {
    'rest-of-uk': [
      { threshold: 50270, rate: 0.20 },
      { threshold: 125140, rate: 0.40 },
      { threshold: Infinity, rate: 0.45 }
    ],
    'scotland': [
      { threshold: 14876, rate: 0.19 },
      { threshold: 26561, rate: 0.20 },
      { threshold: 43662, rate: 0.21 },
      { threshold: 75000, rate: 0.42 },
      { threshold: 125140, rate: 0.45 },
      { threshold: Infinity, rate: 0.48 }
    ]
  };

  function personalAllowanceFor(totalIncome) {
    if (totalIncome > TAPER_END) return 0;
    if (totalIncome > TAPER_START) return Math.max(0, PERSONAL_ALLOWANCE - (totalIncome - TAPER_START) / 2);
    return PERSONAL_ALLOWANCE;
  }

  // Generic UK-style band calculator: bands are cumulative, absolute income
  // thresholds (not widths), each with the rate applying to the slice of
  // income between the previous threshold and this one.
  function taxFromBands(income, bands) {
    var tax = 0;
    var lower = 0;
    for (var i = 0; i < bands.length; i++) {
      if (income <= lower) break;
      var upper = bands[i].threshold;
      var slice = Math.max(0, Math.min(income, upper) - lower);
      tax += slice * bands[i].rate;
      lower = upper;
      if (income <= upper) break;
    }
    return tax;
  }

  function incomeTaxFor(totalIncome, regionKey) {
    var pa = personalAllowanceFor(totalIncome);
    var bands = [{ threshold: pa, rate: 0 }].concat(REGIONS[regionKey]);
    return taxFromBands(totalIncome, bands);
  }

  function class4NiFor(profit) {
    var bands = [
      { threshold: NI_LOWER_PROFITS_LIMIT, rate: 0 },
      { threshold: NI_UPPER_PROFITS_LIMIT, rate: NI_MAIN_RATE },
      { threshold: Infinity, rate: NI_ADDITIONAL_RATE }
    ];
    return taxFromBands(profit, bands);
  }

  function formatMoney(n) {
    var rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    return '£' + rounded.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function compute() {
    var income = Math.max(0, Number(incomeInput.value) || 0);
    var expenses = Math.max(0, Number(expensesInput.value) || 0);
    var otherIncome = Math.max(0, Number(otherIncomeInput.value) || 0);
    var region = REGIONS[regionSelect.value] ? regionSelect.value : 'rest-of-uk';

    var profit = Math.max(0, income - expenses);
    var totalForBanding = otherIncome + profit;
    var personalAllowance = personalAllowanceFor(totalForBanding);

    var taxOnTotal = incomeTaxFor(totalForBanding, region);
    var taxOnOtherAlone = incomeTaxFor(otherIncome, region);
    var incomeTaxOnProfit = Math.max(0, taxOnTotal - taxOnOtherAlone);

    var ni = class4NiFor(profit);
    var total = incomeTaxOnProfit + ni;
    var takeHome = profit - total;
    var effectiveRate = profit > 0 ? (total / profit) * 100 : 0;
    var monthly = total / 12;

    return {
      profit: profit,
      personalAllowance: personalAllowance,
      incomeTaxOnProfit: incomeTaxOnProfit,
      ni: ni,
      total: total,
      takeHome: takeHome,
      effectiveRate: effectiveRate,
      monthly: monthly
    };
  }

  function render() {
    var r = compute();

    profitLine.textContent = '';
    var label = document.createElement('span');
    label.textContent = 'Profit (income − expenses)';
    var value = document.createElement('span');
    value.className = 'tax-profit-value';
    value.textContent = formatMoney(r.profit);
    profitLine.appendChild(label);
    profitLine.appendChild(value);

    resultPersonalAllowance.textContent = formatMoney(r.personalAllowance) +
      (r.personalAllowance < PERSONAL_ALLOWANCE ? ' (reduced — income over £100k)' : '');
    resultIncomeTax.textContent = formatMoney(r.incomeTaxOnProfit);
    resultNi.textContent = formatMoney(r.ni);
    resultTotal.textContent = formatMoney(r.total);
    resultTakeHome.textContent = formatMoney(r.takeHome);
    resultEffectiveRate.textContent = Math.round(r.effectiveRate * 10) / 10 + '%';
    resultMonthly.textContent = formatMoney(r.monthly);

    if (r.profit > 0 && r.profit < SMALL_PROFITS_THRESHOLD) {
      class2Note.hidden = false;
      class2Note.textContent = 'Your profit is below the Small Profits Threshold (£' + SMALL_PROFITS_THRESHOLD.toLocaleString('en-GB') + '), so Class 4 NI and compulsory Class 2 don’t apply. You can still pay voluntary Class 2 NI (about £' + VOLUNTARY_CLASS2_ANNUAL.toFixed(2) + '/year) to protect your State Pension record.';
    } else {
      class2Note.hidden = true;
    }
  }

  function buildSummaryText() {
    var r = compute();
    var regionLabel = regionSelect.options[regionSelect.selectedIndex].text;
    var lines = [
      'Self-Employed Tax Estimate (' + regionLabel + ')',
      '',
      'Profit: ' + formatMoney(r.profit),
      'Personal Allowance (tax-free): ' + formatMoney(r.personalAllowance),
      'Income Tax on this profit: ' + formatMoney(r.incomeTaxOnProfit),
      'Class 4 National Insurance: ' + formatMoney(r.ni),
      'Total tax & NI due: ' + formatMoney(r.total),
      'Estimated take-home: ' + formatMoney(r.takeHome),
      'Effective rate: ' + (Math.round(r.effectiveRate * 10) / 10) + '%',
      'Suggested monthly set-aside: ' + formatMoney(r.monthly),
      '',
      'Rough estimate only — check gov.uk for current rates before relying on this.'
    ];
    return lines.join('\n') + '\n';
  }

  [incomeInput, expensesInput, otherIncomeInput, regionSelect].forEach(function (el) {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  copyBtn.addEventListener('click', function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(buildSummaryText()).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = original; }, 1500);
    }).catch(function () {});
  });

  render();
})();
