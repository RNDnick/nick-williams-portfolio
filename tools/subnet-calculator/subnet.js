(function () {
  var ipInput = document.getElementById('ip-input');
  var prefixInput = document.getElementById('prefix-input');
  var errorEl = document.getElementById('subnet-error');
  var resultsEl = document.getElementById('subnet-results');
  var noteEl = document.getElementById('subnet-note');
  var copyBtn = document.getElementById('copy-btn');
  var binaryOctetsEl = document.getElementById('binary-octets');
  var boundaryLabelsEl = document.getElementById('binary-boundary-labels');
  var rangeFillEl = document.getElementById('range-fill');
  var rangeDotStartEl = document.getElementById('range-dot-start');
  var rangeDotEndEl = document.getElementById('range-dot-end');
  var rangeLabelStartEl = document.getElementById('range-label-start');
  var rangeLabelEndEl = document.getElementById('range-label-end');

  var stat = {
    cidr: document.getElementById('cidr-summary-value'),
    network: document.getElementById('stat-network'),
    broadcast: document.getElementById('stat-broadcast'),
    mask: document.getElementById('stat-mask'),
    wildcard: document.getElementById('stat-wildcard'),
    first: document.getElementById('stat-first'),
    last: document.getElementById('stat-last'),
    usable: document.getElementById('stat-usable'),
    total: document.getElementById('stat-total')
  };

  function parseIPv4(str) {
    var parts = String(str).trim().split('.');
    if (parts.length !== 4) return null;
    var octets = [];
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(parts[i])) return null;
      var n = Number(parts[i]);
      if (n < 0 || n > 255) return null;
      octets.push(n);
    }
    return octets;
  }

  function octetsToInt(octets) {
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  }

  function intToIp(int) {
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
  }

  function maskFromPrefix(prefix) {
    if (prefix === 0) return 0;
    return (0xFFFFFFFF << (32 - prefix)) >>> 0;
  }

  function renderBinaryView(octets, prefix) {
    binaryOctetsEl.textContent = '';
    var octetLabels = ['Octet 1', 'Octet 2', 'Octet 3', 'Octet 4'];

    for (var o = 0; o < 4; o++) {
      var octetEl = document.createElement('div');
      octetEl.className = 'bit-octet';

      var labelEl = document.createElement('div');
      labelEl.className = 'bit-octet-label';
      labelEl.textContent = octetLabels[o];
      octetEl.appendChild(labelEl);

      var valueEl = document.createElement('div');
      valueEl.className = 'bit-octet-value';
      valueEl.textContent = String(octets[o]);
      octetEl.appendChild(valueEl);

      var bitsRow = document.createElement('div');
      bitsRow.className = 'octet-bits';

      for (var b = 0; b < 8; b++) {
        var globalBit = o * 8 + b;
        var weight = 128 >> b;
        var bitValue = (octets[o] >> (7 - b)) & 1;
        var isNetwork = globalBit < prefix;

        var slot = document.createElement('div');
        slot.className = 'bit-slot' + (prefix > 0 && prefix < 32 && globalBit === prefix - 1 ? ' boundary' : '');

        var cell = document.createElement('div');
        cell.className = 'bit-cell ' + (isNetwork ? 'network' : 'host') + (bitValue ? ' on' : '');
        cell.textContent = String(bitValue);
        slot.appendChild(cell);

        var weightEl = document.createElement('div');
        weightEl.className = 'bit-weight';
        weightEl.textContent = String(weight);
        slot.appendChild(weightEl);

        bitsRow.appendChild(slot);
      }

      octetEl.appendChild(bitsRow);
      binaryOctetsEl.appendChild(octetEl);
    }

    boundaryLabelsEl.textContent = '';
    var hostBits = 32 - prefix;

    if (prefix > 0) {
      var netLabel = document.createElement('span');
      netLabel.className = 'label-network';
      netLabel.textContent = 'Network (' + prefix + ')';
      boundaryLabelsEl.appendChild(netLabel);
    }

    if (prefix > 0 && prefix < 32) {
      var sep = document.createElement('span');
      sep.className = 'label-sep';
      sep.textContent = '·';
      boundaryLabelsEl.appendChild(sep);
    }

    if (prefix < 32) {
      var hostLabel = document.createElement('span');
      hostLabel.className = 'label-host';
      hostLabel.textContent = 'Host (' + hostBits + ')';
      boundaryLabelsEl.appendChild(hostLabel);
    }
  }

  function renderRangeBlock(networkInt, broadcastInt, firstHostInt, lastHostInt) {
    var span = broadcastInt - networkInt;
    var startPercent = 0;
    var endPercent = 0;
    if (span > 0) {
      startPercent = Math.max(0, Math.min(100, ((firstHostInt - networkInt) / span) * 100));
      endPercent = Math.max(0, Math.min(100, ((lastHostInt - networkInt) / span) * 100));
    }

    rangeDotStartEl.style.left = startPercent + '%';
    rangeDotEndEl.style.left = endPercent + '%';
    rangeFillEl.style.left = startPercent + '%';
    rangeFillEl.style.width = (endPercent - startPercent) + '%';

    rangeLabelStartEl.textContent = intToIp(firstHostInt);
    rangeLabelEndEl.textContent = intToIp(lastHostInt);
  }

  function setError(message) {
    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      resultsEl.hidden = true;
    } else {
      errorEl.hidden = true;
      resultsEl.hidden = false;
    }
  }

  function render() {
    var rawIp = ipInput.value;
    var rawPrefix = prefixInput.value;

    // Forgive a pasted "ip/prefix" in the address field.
    if (rawIp.indexOf('/') !== -1) {
      var split = rawIp.split('/');
      rawIp = split[0];
      if (split[1] !== undefined && split[1].trim() !== '') {
        rawPrefix = split[1];
        ipInput.value = rawIp.trim();
        prefixInput.value = rawPrefix.trim();
      }
    }

    var octets = parseIPv4(rawIp);
    if (!octets) {
      setError('Enter a valid IPv4 address, like 192.168.1.10.');
      return;
    }

    if (rawPrefix.trim() === '' || !/^\d{1,2}$/.test(rawPrefix.trim())) {
      setError('Enter a prefix length between 0 and 32.');
      return;
    }
    var prefix = Number(rawPrefix.trim());
    if (prefix < 0 || prefix > 32) {
      setError('Prefix length must be between 0 and 32.');
      return;
    }

    setError(null);

    var ipInt = octetsToInt(octets);
    var maskInt = maskFromPrefix(prefix);
    var networkInt = (ipInt & maskInt) >>> 0;
    var broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
    var wildcardInt = (~maskInt) >>> 0;
    var totalAddresses = Math.pow(2, 32 - prefix);

    var usableHosts, firstHostInt, lastHostInt, note;
    if (prefix === 32) {
      usableHosts = 1;
      firstHostInt = networkInt;
      lastHostInt = networkInt;
      note = 'A /32 is a single host route — there’s no separate network or broadcast address, just this one host.';
    } else if (prefix === 31) {
      usableHosts = 2;
      firstHostInt = networkInt;
      lastHostInt = broadcastInt;
      note = 'A /31 is a point-to-point link (RFC 3021) — both addresses are usable and there’s no broadcast address.';
    } else {
      usableHosts = Math.max(totalAddresses - 2, 0);
      firstHostInt = networkInt + 1;
      lastHostInt = broadcastInt - 1;
      note = null;
    }

    stat.cidr.textContent = intToIp(networkInt) + '/' + prefix;
    stat.network.textContent = intToIp(networkInt);
    stat.broadcast.textContent = prefix === 31 || prefix === 32 ? 'n/a' : intToIp(broadcastInt);
    stat.mask.textContent = intToIp(maskInt);
    stat.wildcard.textContent = intToIp(wildcardInt);
    stat.first.textContent = intToIp(firstHostInt);
    stat.last.textContent = intToIp(lastHostInt);
    stat.usable.textContent = usableHosts.toLocaleString();
    stat.total.textContent = totalAddresses.toLocaleString();

    if (note) {
      noteEl.textContent = note;
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }

    renderBinaryView(octets, prefix);
    renderRangeBlock(networkInt, broadcastInt, firstHostInt, lastHostInt);
  }

  ipInput.addEventListener('input', render);
  prefixInput.addEventListener('input', render);

  copyBtn.addEventListener('click', function () {
    var text = stat.cidr.textContent;
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      var original = copyBtn.textContent;
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = original; }, 1500);
    }).catch(function () {});
  });

  render();
})();
