/* Deterministic prototype logic. No model, affiliate weighting, or payout testing. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CasinoMatcher = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalise(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'");
  }
  var defaults = {
    country: null, method: null, experience: null, fast: false, bonus: 'any',
    games: [], amount: null, minWithdrawal: null, avoidVerification: false,
    strictSpeed: false, maxHours: null, otherPriorities: [], blocked: null
  };
  var countryRules = [
    ['ES', /\b(?:spain|espana|spanish|espagn[eoa]l)\b/g],
    ['GB', /\b(?:uk|u\.k\.|united kingdom|great britain|britain|british|england|scotland|wales|northern ireland)\b/g],
    ['DE', /\b(?:germany|deutschland|german|alemania)\b/g],
    ['US', /\b(?:usa|u\.s\.a\.|united states|american|america|us resident)\b/g],
    ['CA', /\b(?:canada|canadian)\b/g], ['FR', /\b(?:france|french|francia)\b/g],
    ['IT', /\b(?:italy|italia|italian)\b/g], ['PT', /\b(?:portugal|portuguese)\b/g],
    ['IE', /\b(?:(?<!northern )ireland|irish)\b/g], ['NL', /\b(?:netherlands|holland|dutch)\b/g],
    ['AU', /\b(?:australia|australian)\b/g], ['NZ', /\b(?:new zealand|new zealander)\b/g],
    ['SE', /\b(?:sweden|swedish)\b/g], ['NO', /\b(?:norway|norwegian)\b/g],
    ['DK', /\b(?:denmark|danish)\b/g], ['FI', /\b(?:finland|finnish)\b/g],
    ['BE', /\b(?:belgium|belgian)\b/g], ['CH', /\b(?:switzerland|swiss)\b/g],
    ['AT', /\b(?:austria|austrian)\b/g], ['PL', /\b(?:poland|polish)\b/g],
    ['GR', /\b(?:greece|greek)\b/g], ['RO', /\b(?:romania|romanian)\b/g],
    ['BR', /\b(?:brazil|brazilian|brasil)\b/g], ['MX', /\b(?:mexico|mexican)\b/g],
    ['AR', /\b(?:argentina|argentinian)\b/g], ['CL', /\b(?:chile|chilean)\b/g],
    ['IN', /\b(?:india|indian)\b/g], ['ZA', /\b(?:south africa|south african)\b/g],
    ['JP', /\b(?:japan|japanese)\b/g], ['CN', /\b(?:china|chinese)\b/g],
    ['AE', /\b(?:uae|united arab emirates|dubai)\b/g], ['TR', /\b(?:turkey|turkiye|turkish)\b/g]
  ];
  var methodRules = [
    ['PayPal', /\bpay\s?pal\b/g], ['Visa', /\bvisa\b/g], ['Mastercard', /\bmaster\s?card\b/g],
    ['Apple Pay', /\bapple\s?pay\b/g], ['Google Pay', /\bgoogle\s?pay\b/g],
    ['Bank transfer', /\b(?:bank\s*(?:transfer|wire)|wire\s*transfer|banking|bank account|transferencia bancaria)\b/g],
    ['Skrill', /\bskrill\b/g], ['Neteller', /\bneteller\b/g],
    ['Paysafecard', /\bpaysafe\s?card\b/g], ['Trustly', /\btrustly\b/g], ['Brite', /\bbrite\b/g],
    ['Bizum', /\bbizum\b/g], ['Bitcoin', /\b(?:bitcoin|btc)\b/g],
    ['Crypto', /\b(?:crypto|cryptocurrency)\b/g], ['Revolut', /\brevolut\b/g],
    ['Card', /\b(?:credit card|debit card|card withdrawals?)\b/g]
  ];
  var gameRules = [
    ['slots', /\b(?:slots?|slot machines?|tragaperras)\b/g],
    ['roulette', /\b(?:roulette|ruleta)\b/g], ['blackjack', /\bblack\s?jack\b/g],
    ['live casino', /\b(?:live casino|live dealer|casino en vivo)\b/g], ['poker', /\bpoker\b/g],
    ['baccarat', /\bbaccarat\b/g], ['bingo', /\bbingo\b/g]
  ];

  function mentions(text, rules) {
    var out = [];
    rules.forEach(function (rule) {
      var re = new RegExp(rule[1].source, 'g'), hit;
      while ((hit = re.exec(text))) out.push({ value: rule[0], index: hit.index, text: hit[0], negative: negated(text, hit.index) });
    });
    return out.sort(function (a, b) { return a.index - b.index || b.text.length - a.text.length; });
  }
  function negated(text, index) {
    var before = text.slice(0, index).split(/[;.!?\n]/).pop().slice(-70);
    // End the scope at an explicit contrast/action; "not PayPal, use Visa" keeps Visa positive.
    before = before.split(/\b(?:but|instead|rather)\b/).pop();
    var actions = /\b(?:use|using|prefer|want|choose|with)\b/g, action, resetAt = 0;
    while ((action = actions.exec(before))) {
      var prefix = before.slice(0, action.index);
      if (!/\b(?:not|no|without|avoid|don't|do not|never)\s*$/.test(prefix)) resetAt = action.index + action[0].length;
    }
    before = before.slice(resetAt);
    return /\b(?:not|no|without|avoid|except|don't|do not|never|neither|nor|isn't|is not)\s+(?:\w+\s+){0,3}$/.test(before) || /\b(?:not|no|without|avoid|except|don't|never)\s*$/.test(before);
  }
  function numberValue(raw) {
    var s = String(raw).trim().replace(/\s/g, ''), multiplier = /k$/i.test(s) ? 1000 : 1;
    s = s.replace(/k$/i, '');
    if (/^\d{1,3}(?:[,.]\d{3})+(?:[,.]\d{1,2})?$/.test(s)) {
      var last = s.match(/[,.](\d{1,2})$/);
      s = last ? s.slice(0, -last[0].length).replace(/[,.]/g, '') + '.' + last[1] : s.replace(/[,.]/g, '');
    } else s = s.replace(',', '.');
    var n = Number(s) * multiplier;
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function safetyBlock(text) {
    if (/\b(?:under\s*18|underage|minor|i(?:'m| am)\s+(?:[1-9]|1[0-7])(?:\s*(?:years? old|yo))?\b|(?:age|aged)\s*(?:[1-9]|1[0-7])\b)/.test(text))
      return 'This comparison is for adults aged 18 or over. Casino recommendations are unavailable for this request.';
    if (/\b(?:chasing (?:my )?losses|(?:win|get|make)\s+back\s+(?:(?:my|the)\s+)?(?:losses|money|rent)|recover\s+(?:(?:my|the)\s+)?(?:losses|lost money)|lost\s+(?:my\s+)?rent|gamble\s+(?:my\s+)?rent|self[- ]excluded|self exclusion|bypass\s+gamstop)\b/.test(text))
      return 'Casino recommendations are paused for this request. Gambling cannot reliably recover losses. Consider stepping away and using the responsible gambling support on this page.';
    return null;
  }

  function parsePreferences(input, previous) {
    var text = normalise(input), raw = String(input || ''), p = Object.assign({}, defaults, previous || {});
    p.games = Array.isArray(p.games) ? p.games.slice() : [];
    p.otherPriorities = Array.isArray(p.otherPriorities) ? p.otherPriorities.slice() : [];
    p.blocked = safetyBlock(text) || p.blocked || null;

    var countries = mentions(text, countryRules), positives = countries.filter(function (m) { return !m.negative; });
    if (positives.length) p.country = positives[positives.length - 1].value;
    else if (countries.some(function (m) { return m.value === p.country && m.negative; })) p.country = null;
    // Accept explicit uppercase ISO answers without interpreting the English pronoun "us" as USA.
    var isoPattern = '(ES|GB|UK|DE|US|CA|FR|IT|PT|IE|NL|AU|NZ|SE|NO|DK|FI|BE|CH|AT|PL|GR|RO|BR|MX|AR|CL|IN|ZA|JP|CN|AE|TR)';
    var iso = raw.trim().match(new RegExp('^' + isoPattern + '[.!]?$')) || raw.match(new RegExp('(?:\\bcountry\\s*[:=]?\\s*|\\b(?:in|from)\\s+)' + isoPattern + '\\b'));
    if (!positives.length && iso) p.country = iso[1] === 'UK' ? 'GB' : iso[1];
    if (/\b(?:country (?:is )?(?:unknown|unspecified)|not sure (?:of|about) my country|clear (?:my )?country)\b/.test(text)) p.country = null;
    if (!countries.length && !iso && /\b(?:(?:i (?:live|reside|am based|am)|i'm(?: based)?|resident)\s+in\s+|my country is\s+)[a-z]+/.test(text)) p.country = null;

    var methods = mentions(text, methodRules), positiveMethods = methods.filter(function (m) { return !m.negative; });
    positiveMethods = positiveMethods.filter(function (m) { return m.value !== 'Card' || !positiveMethods.some(function (specific) { return ['Visa', 'Mastercard'].indexOf(specific.value) !== -1 && Math.abs(specific.index - m.index) < 25; }); });
    if (positiveMethods.length) p.method = positiveMethods[positiveMethods.length - 1].value;
    else if (methods.some(function (m) { return m.negative && m.value === p.method; })) p.method = null;
    if (/\b(?:any (?:payment |withdrawal )?method|no (?:payment |withdrawal )?method preference|method (?:doesn't|does not) matter|clear (?:my )?(?:payment |withdrawal )?method)\b/.test(text)) p.method = null;

    if (/\b(?:beginner|new player|new to (?:casino|gambling|this)|first[- ]time player|never (?:gambled|played) before|inexperienced)\b/.test(text)) p.experience = 'new';
    if (/\b(?:experienced|regular player|not (?:a )?(?:beginner|new player))\b/.test(text) && !/\bnot experienced\b/.test(text)) p.experience = 'experienced';
    if (/\bnot experienced\b/.test(text)) p.experience = 'new';

    if (/\b(?:no[- ]wagering|zero[- ]wagering|without (?:any )?wagering|no (?:wagering|playthrough)(?: requirement)?|wager[- ]free)\b/.test(text)) p.bonus = 'no-wagering';
    else if (/\b(?:no bonus(?:es)?|without (?:a |any )?bonus|avoid bonus(?:es)?|don't want (?:a |any )?bonus)\b/.test(text)) p.bonus = 'none';
    else if (/\b(?:simple|straightforward|clear|low)[- ]+(?:bonus|wagering)|\bbonus (?:terms|conditions) (?:are )?(?:simple|straightforward|clear)\b/.test(text)) p.bonus = 'simple';
    else if (/\b(?:any bonus|bonus(?:es)? (?:don't|doesn't|do not|does not) matter|no bonus preference)\b/.test(text)) p.bonus = 'any';

    if (/\b(?:no kyc|no verification|without (?:identity |documentary |any )?verification|verification[- ]free|identity[- ]free|no (?:id|identity checks|documents)|without (?:id|documents)|avoid (?:all )?(?:kyc|identity checks))\b/.test(text)) p.avoidVerification = true;
    if (/\b(?:i (?:can|will|am happy to) (?:verify|provide (?:id|documents))|kyc is (?:fine|okay|ok)|verification is (?:fine|okay|ok)|i accept verification|verification[- ]free (?:isn't|is not) required)\b/.test(text)) p.avoidVerification = false;
    if (/\b(?:verification|kyc)\b/.test(text) && /\b(?:delay|delays|long|clear|clarity|straightforward)\b/.test(text)) addPriority(p, 'verification clarity');
    if (/\b(?:clear (?:withdrawal|payment|terms)|transparent|clarity|straightforward (?:withdrawal|conditions))\b/.test(text)) addPriority(p, 'clear conditions');
    if (/\b(?:no fees|low fees|fee[- ]free)\b/.test(text)) addPriority(p, 'fees');

    if (/\b(?:fast|faster|quick|quickly|instant|immediate|same[- ]day|speed)\b/.test(text)) p.fast = true;
    var time = text.match(/\b(?:within|under|less than|at most|maximum(?: of)?|no more than|in)\s+(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h\b|days?|minutes?|mins?)/);
    if (time) { p.maxHours = Number(time[1].replace(',', '.')) * (/^day/.test(time[2]) ? 24 : /^min/.test(time[2]) ? 1 / 60 : 1); p.strictSpeed = true; p.fast = true; }
    if (/\b(?:must (?:be |have |get |arrive )?(?:instant|immediate)|guaranteed (?:instant|immediate)|only instant|instant (?:is )?required)\b/.test(text)) { p.strictSpeed = true; p.maxHours = 0; p.fast = true; }
    else if (/\b(?:guaranteed (?:payout|withdrawal|speed)|must (?:have|be) (?:a )?(?:guaranteed|same[- ]day)|same[- ]day (?:is )?required)\b/.test(text)) { p.strictSpeed = true; p.maxHours = p.maxHours == null ? 24 : p.maxHours; p.fast = true; }
    if (/\b(?:speed (?:doesn't|does not) matter|no speed preference|no (?:speed |payout |withdrawal )?guarantee (?:is )?(?:needed|required)|not strict|just a preference|not a hard (?:limit|requirement))\b/.test(text)) { p.strictSpeed = false; p.maxHours = null; }
    if (/\b(?:speed (?:doesn't|does not) matter|no speed preference|no rush|not concerned (?:with|about) speed)\b/.test(text)) { p.fast = false; p.strictSpeed = false; p.maxHours = null; }

    var gameMentions = mentions(text, gameRules);
    if (/\b(?:any games?|no game preference|games? (?:don't|doesn't|do not|does not) matter)\b/.test(text)) p.games = [];
    else if (gameMentions.length) {
      if (/\b(?:only|instead|change (?:my )?games? to|switch to)\b/.test(text)) p.games = [];
      gameMentions.forEach(function (m) {
        if (m.negative) p.games = p.games.filter(function (g) { return g !== m.value; });
        else if (p.games.indexOf(m.value) === -1) p.games.push(m.value);
      });
    }

    var number = '(\\d[\\d.,]*(?:\\s?k)?)', currency = '[€$£]?\\s*';
    var min = text.match(new RegExp('(?:minimum|min\\.?)[- ]+(?:withdrawal|cashout)(?:\\s+(?:of|under|below|up to|is|:))?\\s*' + currency + number)) || text.match(new RegExp('(?:withdrawal|cashout)[- ]+(?:minimum|min\\.?)(?:\\s+(?:of|under|below|up to|is|:))?\\s*' + currency + number));
    if (min) p.minWithdrawal = numberValue(min[1]);
    if (/\b(?:no minimum|zero minimum)\b/.test(text)) p.minWithdrawal = 0;
    var amount = text.match(new RegExp('\\b(?:withdraw|withdrawing|cash out|withdrawal amount|cashout amount)(?:\\s+(?:of|around|about|at least|up to|is|:))?\\s*' + currency + number));
    if (!amount) amount = text.match(new RegExp(currency + number + '\\s*(?:euros?|eur)?\\s*(?:withdrawal|cashout)\\b'));
    if (!amount && !min && /\b(?:withdrawal|withdrawals|withdraw|limit|limits|cashout)\b/.test(text)) amount = text.match(new RegExp('[€$£]\\s*' + number));
    if (amount && !/^\s*(?:hours?|hrs?|days?|minutes?|mins?)\b/.test(text.slice((amount.index || 0) + amount[0].length))) {
      p.amount = numberValue(amount[1]);
      p.otherPriorities = p.otherPriorities.filter(function (s) { return !/^amount-currency:/.test(s); });
      if (amount[0].indexOf('$') !== -1 || /\busd\b/.test(text)) addPriority(p, 'amount-currency:USD');
      if (amount[0].indexOf('£') !== -1 || /\bgbp\b/.test(text)) addPriority(p, 'amount-currency:GBP');
    }
    if (/\b(?:no (?:withdrawal )?amount requirement|ignore (?:the |my )?(?:withdrawal )?amount|clear (?:the |my )?(?:withdrawal )?amount|any (?:withdrawal )?amount)\b/.test(text)) { p.amount = null; p.otherPriorities = p.otherPriorities.filter(function (s) { return !/^amount-currency:/.test(s); }); }
    if (/\b(?:no minimum preference|ignore (?:the |my )?minimum|clear (?:the |my )?minimum)\b/.test(text)) p.minWithdrawal = null;
    return p;
  }
  function addPriority(p, priority) { if (p.otherPriorities.indexOf(priority) === -1) p.otherPriorities.push(priority); }
  function evidenced(field) { return !!(field && field.verified === true && field.value !== null && field.value !== undefined); }
  function value(operator, key) { return evidenced(operator[key]) ? operator[key].value : null; }
  function methodEquivalent(actual, wanted) {
    var a = normalise(actual), w = normalise(wanted);
    if (a === w) return true;
    // Generic "Card" evidence does not establish Visa or Mastercard availability.
    if (w === 'bank transfer') return /\bbank transfer\b/.test(a);
    if (w === 'trustly') return /\btrustly\b/.test(a);
    if (w === 'visa' || w === 'mastercard') return a.split(/\s*\/\s*/).indexOf(w) !== -1;
    return false;
  }
  function availableMethods(operator) { var v = value(operator, 'withdrawalMethods'); return Array.isArray(v) ? v : []; }
  function methodCategory(method) {
    if (['PayPal', 'Skrill', 'Neteller'].indexOf(method) !== -1) return 'eWallets';
    if (['Visa', 'Mastercard', 'Card'].indexOf(method) !== -1) return 'cards';
    if (method === 'Brite') return 'brite';
    return null;
  }
  function methodNumber(map, method) {
    if (!map) return null;
    var keys = Object.keys(map), found = keys.find(function (k) { return methodEquivalent(k, method); });
    if (!found) found = keys.find(function (k) { return normalise(k) === normalise(methodCategory(method)); });
    return found && typeof map[found] === 'number' && Number.isFinite(map[found]) ? map[found] : null;
  }
  function limitsFor(operator, method) {
    var limits = value(operator, 'withdrawalLimits');
    if (!limits || typeof limits !== 'object') return null;
    var minimum = methodNumber(limits.minimumByMethod, method), maximum = methodNumber(limits.maximumByMethod, method);
    if (minimum == null && typeof limits.minimum === 'number') minimum = limits.minimum;
    if (minimum == null && method === 'Bank transfer' && typeof limits.bankTransferMinimum === 'number') minimum = limits.bankTransferMinimum;
    if (maximum == null && typeof limits.maximum === 'number') maximum = limits.maximum;
    return { minimum: minimum, maximum: maximum, currency: limits.currency || null, period: limits.period || null };
  }
  function money(number) { return '€' + String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function rankOperators(operators, preferences) {
    var prefs = Object.assign({}, defaults, preferences || {}), list = Array.isArray(operators) ? operators.slice() : [], excluded = [];
    prefs.games = Array.isArray(prefs.games) ? prefs.games : [];
    prefs.otherPriorities = Array.isArray(prefs.otherPriorities) ? prefs.otherPriorities : [];
    var base = { results: [], excluded: excluded, needsCountry: !prefs.country, blocked: prefs.blocked || null, summary: '' };
    if (prefs.blocked) { base.summary = prefs.blocked; list.forEach(function (o) { excluded.push({ id: o.id, reason: prefs.blocked }); }); return base; }
    if (!prefs.country) { base.summary = 'Which country do you live in? Country evidence is required before creating a shortlist.'; list.forEach(function (o) { excluded.push({ id: o.id, reason: 'Country not supplied; jurisdiction evidence cannot be matched.' }); }); return base; }

    var results = [];
    list.forEach(function (operator) {
      var jurisdiction = value(operator, 'jurisdiction');
      function exclude(reason) { excluded.push({ id: operator.id, reason: reason }); }
      if (!jurisdiction || jurisdiction.countryCode !== prefs.country) { exclude('No verified jurisdiction evidence for ' + prefs.country + ' for this exact operator domain.'); return; }
      if (prefs.avoidVerification) {
        // A statement that verification is not needed must itself be explicit verified evidence.
        var verification = value(operator, 'verification');
        if (!verification || typeof verification !== 'object' || verification.identityFree !== true) { exclude('Verification-free withdrawals are not established. Identity checks may be required.'); return; }
      }
      var methods = availableMethods(operator);
      if (prefs.method && !methods.some(function (m) { return methodEquivalent(m, prefs.method); })) { exclude(prefs.method + ' withdrawals are not positively verified.'); return; }
      var timing = value(operator, 'withdrawalTiming');
      if (prefs.strictSpeed) {
        var max = timing && timing.totalMaximumHours;
        if (typeof max !== 'number' || !Number.isFinite(max) || prefs.maxHours == null || max > prefs.maxHours) { exclude('No verified end-to-end maximum meets the requested payout time. Processing and post-approval settlement are separate.'); return; }
      }
      var bonus = value(operator, 'bonus'), noWagering = !!(bonus && typeof bonus === 'object' && /\bno wagering requirement\b/i.test(bonus.operatorPolicy || ''));
      if (prefs.bonus === 'no-wagering' && !noWagering) { exclude('A published no-wagering policy is not verified.'); return; }
      var amountMethod = null, limits = null;
      if (prefs.amount != null || prefs.minWithdrawal != null) {
        if (prefs.otherPriorities.some(function (p) { return /^amount-currency:(?!EUR)/.test(p); })) { exclude('The requested currency does not match the verified EUR limits.'); return; }
        var candidates = prefs.method ? [prefs.method] : methods;
        amountMethod = candidates.find(function (method) {
          var l = limitsFor(operator, method);
          return l && l.currency === 'EUR' &&
            (prefs.amount == null || (l.minimum != null && l.maximum != null && prefs.amount >= l.minimum && prefs.amount <= l.maximum)) &&
            (prefs.minWithdrawal == null || (l.minimum != null && l.minimum <= prefs.minWithdrawal));
        });
        if (!amountMethod) { exclude('Verified numeric withdrawal limits do not establish support for your amount/minimum with the requested method. Unknown maximums do not mean unlimited.'); return; }
        limits = limitsFor(operator, amountMethod);
      }

      var score = 0, matches = [], cautions = [], matchedFields = [];
      function match(field, message, points) { matchedFields.push(field); matches.push(message); score += points; }
      var evidenceFields = ['jurisdiction', 'withdrawalMethods', 'withdrawalTiming', 'withdrawalLimits', 'verification', 'bonus', 'games'];
      var complete = evidenceFields.filter(function (key) { return evidenced(operator[key]); }).length;
      score += complete * (prefs.experience === 'new' ? 3 : 2);
      match('jurisdiction', 'Jurisdiction evidence supports this Spanish domain. Individual account eligibility still needs checking.', 1);
      if (prefs.method) match('withdrawalMethods', prefs.method + ' is explicitly listed as a withdrawal method in the supporting source.', 24);
      else if (methods.length) match('withdrawalMethods', 'Published withdrawal methods are available for comparison.', 2);
      else cautions.push('Withdrawal methods: not verified.');
      if (limits) {
        if (prefs.amount != null) match('withdrawalLimits', 'Published ' + amountMethod + ' limits span ' + money(limits.minimum) + '–' + money(limits.maximum) + ', including your ' + money(prefs.amount) + ' amount.', 26);
        else match('withdrawalLimits', 'The published ' + amountMethod + ' minimum is ' + money(limits.minimum) + ', meeting your minimum preference.', 20);
        cautions.push('Limit period is ' + (limits.period ? limits.period.toLowerCase() : 'not verified') + '; confirm the current account-specific cashier limits.');
        if (limits.maximum == null) cautions.push('Only part of the withdrawal-limit information is verified. The maximum is not established; do not assume unlimited withdrawals.');
      } else if (!value(operator, 'withdrawalLimits')) cautions.push('Withdrawal limits: not verified.');
      else cautions.push('Only part of the withdrawal-limit information is verified; check the method and current cashier.');
      if (prefs.fast) {
        if (timing && timing.operatorPublishedClaim) {
          match('withdrawalTiming', 'The operator publishes this conditional timing claim: “' + timing.operatorPublishedClaim + '.”', 11);
          cautions.push('This is an operator majority claim, not a guaranteed payout time or our own payment test. Manual checks can delay it.');
        } else if (timing && timing.processing && timing.processing !== 'Not verified') {
          var points = /24/.test(timing.processing) ? (/working/.test(timing.processing) ? 5 : 7) : 1;
          match('withdrawalTiming', 'Published processing: ' + timing.processing + '. This does not include a guaranteed total arrival time.', points);
        } else cautions.push('Processing speed is not verified for your request.');
        if (timing && prefs.method && timing.settlementAfterApproval) {
          var category = methodCategory(prefs.method), settlement = category === 'eWallets' ? timing.settlementAfterApproval.eWallets || timing.settlementAfterApproval.cardsAndListedWallets : category === 'cards' ? timing.settlementAfterApproval.cards || timing.settlementAfterApproval.cardsAndListedWallets : prefs.method === 'Bank transfer' || prefs.method === 'Trustly' ? timing.settlementAfterApproval.bankTransfer : category === 'brite' ? timing.settlementAfterApproval.brite : null;
          if (settlement) cautions.push('After approval, the published method estimate is: ' + settlement + '. This is separate from processing.');
        }
      }
      if (!timing || timing.totalMaximumHours == null) cautions.push('End-to-end payout maximum: not verified. Processing, identity checks, and payment settlement can take different amounts of time.');
      if (prefs.bonus === 'no-wagering' || prefs.bonus === 'simple') {
        if (noWagering) {
          match('bonus', 'The FAQ publishes a no-wagering policy. Offer-specific eligibility and other conditions still need checking.', prefs.bonus === 'no-wagering' ? 35 : 22);
          cautions.push('This policy does not establish a current bonus amount or that a particular offer is available to you.');
        } else cautions.push('Straightforward bonus terms are not established by current offer-specific evidence.');
      } else if (prefs.bonus === 'none') matches.push('Your comparison does not use bonus value as a ranking benefit. Decline optional bonuses and check account terms.');
      var games = value(operator, 'games');
      prefs.games.forEach(function (game) {
        if (Array.isArray(games) && games.indexOf(game) !== -1) match('games', 'The operator-visible categories include ' + game + '.', 16);
        else { cautions.push('Your preferred game category (' + game + ') is not verified in this dataset.'); score -= 5; }
      });
      if (prefs.experience === 'new') match('evidence', 'Clearer published information is weighted more heavily for a new player; it does not imply lower gambling risk.', complete);
      if (prefs.otherPriorities.indexOf('verification clarity') !== -1 || prefs.otherPriorities.indexOf('clear conditions') !== -1) {
        if (value(operator, 'verification')) { match('verification', 'The withdrawal-verification requirements are documented; checks cannot be bypassed or promised fast.', 4); }
        else { cautions.push('Verification requirements and review duration are not verified.'); score -= 4; }
      }
      if (prefs.otherPriorities.indexOf('fees') !== -1) cautions.push('Your fee preference needs account-level confirmation; a complete method-specific fee comparison is unavailable.');
      var restrictions = Array.isArray(operator.restrictions) ? operator.restrictions : [];
      restrictions.forEach(function (restriction) { if (evidenced(restriction) && typeof restriction.value === 'string') cautions.push(restriction.value); });
      if (operator.withdrawalTiming && operator.withdrawalTiming.note) cautions.push(operator.withdrawalTiming.note);
      cautions.push('No gambling outcome or payout is guaranteed. This is source-based comparison; no account, payment, or gameplay was tested.');
      results.push({ operator: operator, score: score, matches: matches, cautions: Array.from(new Set(cautions)), matchedFields: Array.from(new Set(matchedFields)) });
    });
    results.sort(function (a, b) { return b.score - a.score || normalise(a.operator.name).localeCompare(normalise(b.operator.name), 'en') || String(a.operator.id).localeCompare(String(b.operator.id), 'en'); });
    base.results = results.slice(0, 3);
    base.summary = results.length ? 'Up to three evidence-based comparisons for your preferences. Published Spanish-domain evidence is not personal eligibility approval, a payout test, or a guarantee. Gambling can lead to losses.' : 'No evidenced match meets your requirements. Missing data is not treated as support. You can change a preference; the prototype will not relax it automatically.';
    if (!results.length && prefs.country !== 'ES') base.summary = 'This dataset only establishes Spanish-domain jurisdiction evidence. It cannot create a shortlist for ' + prefs.country + '. No operators are verified for that country here.';
    if (!results.length && prefs.avoidVerification) base.summary = 'No verification-free withdrawals are evidenced. Identity or payment checks may be required. The prototype cannot recommend an operator on a no-KYC basis.';
    if (!results.length && prefs.strictSpeed) base.summary = 'No verified end-to-end payout maximum meets your time requirement. Processing estimates cannot be substituted for total arrival time.';
    return base;
  }
  return Object.freeze({ parsePreferences: parsePreferences, rankOperators: rankOperators });
});
