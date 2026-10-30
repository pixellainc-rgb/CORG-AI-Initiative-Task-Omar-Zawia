'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const matcher = require('../dist/matcher.js');
const operators = require('../research/operator-evidence.json').operators;
const { parsePreferences, rankOperators } = matcher;
function rank(text, previous) { return rankOperators(operators, parsePreferences(text, previous)); }
function ids(result) { return result.results.map(r => r.operator.id); }

test('module and standalone browser global expose the same pure API', () => {
  const browser = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/matcher.js'), 'utf8'), browser);
  assert.equal(typeof browser.CasinoMatcher.parsePreferences, 'function');
  assert.equal(typeof browser.CasinoMatcher.rankOperators, 'function');
});
test('missing country asks a follow-up and never assumes Spain', () => {
  const r = rank('Fast PayPal withdrawals please');
  assert.equal(r.needsCountry, true);
  assert.deepEqual(r.results, []);
  assert.equal(r.excluded.length, operators.length);
});
test('jurisdiction is hard gated and other recognised countries are preserved', () => {
  for (const [input, country] of [['United Kingdom', 'GB'], ['UK', 'GB'], ['Germany', 'DE'], ['USA', 'US'], ['Canada', 'CA'], ['France', 'FR'], ['Italy', 'IT']]) {
    const p = parsePreferences('I live in ' + input);
    assert.equal(p.country, country);
    const r = rankOperators(operators, p);
    assert.equal(r.results.length, 0);
    assert.equal(r.needsCountry, false);
  }
  assert.equal(parsePreferences('Soy residente en España').country, 'ES');
  assert.equal(parsePreferences('Spanish resident').country, 'ES');
  assert.equal(parsePreferences('I live in Atlantis', { country: 'ES' }).country, null);
  assert.equal(parsePreferences("I'm in Atlantis", { country: 'ES' }).country, null);
  assert.equal(parsePreferences('I am in UK, not Spain').country, 'GB');
  assert.equal(parsePreferences('ES').country, 'ES');
  assert.equal(parsePreferences('I live in US').country, 'US');
  assert.equal(parsePreferences('NO BONUS').country, null);
  assert.equal(parsePreferences('NO KYC', { country: 'ES' }).country, 'ES');
  assert.equal(parsePreferences('Northern Ireland').country, 'GB');
});
test('payment negation and explicit changes do not reuse stale preferred methods', () => {
  assert.equal(parsePreferences('not PayPal; use Visa', { method: 'PayPal' }).method, 'Visa');
  assert.equal(parsePreferences('not PayPal, use Visa').method, 'Visa');
  assert.equal(parsePreferences('No PayPal, I prefer bank transfer').method, 'Bank transfer');
  assert.equal(parsePreferences('not PayPal', { method: 'PayPal' }).method, null);
  assert.equal(parsePreferences("I don't want PayPal", { method: 'PayPal' }).method, null);
  assert.equal(parsePreferences('avoid using PayPal; I want Visa').method, 'Visa');
  assert.equal(parsePreferences('Visa debit card').method, 'Visa');
  assert.equal(parsePreferences('PayPal not Visa').method, 'PayPal');
  assert.equal(parsePreferences('any payment method', { method: 'Visa' }).method, null);
  assert.equal(rank('Spain, withdraw via Bizum').results.length, 0);
});
test('a supported method must have positive verified evidence, and generic card is insufficient', () => {
  const visa = rank('Spain, Visa');
  assert.ok(visa.results.length > 0);
  assert.ok(!ids(visa).includes('casino777'));
  assert.ok(!ids(rank('Spain PayPal')).includes('playuzu'));
  assert.ok(visa.excluded.some(e => e.id === 'casino777' && /not positively verified/.test(e.reason)));
});
test('no KYC and no verification cannot produce unsupported identity-free suggestions', () => {
  for (const phrase of ['no KYC', 'no verification', 'without ID', 'identity-free']) {
    const p = parsePreferences('Spain, ' + phrase);
    assert.equal(p.avoidVerification, true);
    assert.equal(rankOperators(operators, p).results.length, 0);
  }
  const p = parsePreferences('Spain, avoid long verification delays');
  assert.equal(p.avoidVerification, false);
  assert.ok(p.otherPriorities.includes('verification clarity'));
  assert.ok(rankOperators(operators, p).results.length > 0);
  assert.equal(parsePreferences('KYC is fine', { avoidVerification: true }).avoidVerification, false);
});
test('strict payout speed cannot be inferred from processing or settlement snippets', () => {
  const p = parsePreferences('Spain, I must get my withdrawal within 24 hours');
  assert.equal(p.strictSpeed, true);
  assert.equal(p.maxHours, 24);
  assert.equal(rankOperators(operators, p).results.length, 0);
  assert.equal(rank('Spain, guaranteed instant withdrawals').results.length, 0);
  assert.ok(rank('Spain, fast Visa withdrawals').results.length > 0);
  const relaxed = parsePreferences('Not strict, just fast', p);
  assert.equal(relaxed.maxHours, null);
  assert.equal(relaxed.strictSpeed, false);
});
test('amounts handle formatted EUR and k notation without interpreting time as money', () => {
  for (const phrase of ['withdraw €15000', 'withdraw 15k', 'withdraw €15,000', 'withdraw €15.000', '€15000 withdrawal']) assert.equal(parsePreferences(phrase).amount, 15000, phrase);
  assert.equal(parsePreferences('withdraw within 24 hours').amount, null);
  assert.equal(parsePreferences('withdraw €15k in 24 hours').amount, 15000);
  assert.equal(parsePreferences('minimum withdrawal of €10').minWithdrawal, 10);
});
test('known numeric maximum is required; PayPal above €10k differs from bank transfer', () => {
  const paypal = rank('Spain, PayPal, withdraw €15000');
  const bank = rank('Spain, bank transfer, withdraw 15k');
  assert.deepEqual(paypal.results, []);
  assert.deepEqual(ids(bank), ['leovegas']);
  assert.match(bank.results[0].matches.join(' '), /€50,000/);
  assert.match(bank.results[0].cautions.join(' '), /not specified/);
  assert.doesNotMatch(bank.results[0].matches.join(' '), /daily|monthly|unlimited/i);
  assert.equal(rank('Spain, PayPal, withdraw €5').results.length, 0);
  assert.equal(rank('Spain, bank transfer, withdraw $15000').results.length, 0);
});
test('minimum preferences can use verified method minimums without inventing maximums', () => {
  const r = rank('Spain, Visa, minimum withdrawal of €5');
  assert.deepEqual(ids(r), ['playuzu']);
  assert.match(r.results[0].cautions.join(' '), /part of the withdrawal-limit/);
  assert.equal(parsePreferences('no minimum').minWithdrawal, 0);
});
test('no-wagering prioritises only verified policy and never invents an offer amount', () => {
  const r = rank('Spain, Visa, no-wagering bonus please');
  assert.deepEqual(ids(r), ['playuzu']);
  assert.match(r.results[0].matches.join(' '), /policy/);
  assert.match(r.results[0].cautions.join(' '), /does not establish a current bonus amount/);
  assert.equal(parsePreferences('no bonus').bonus, 'none');
  assert.equal(parsePreferences('straightforward bonus conditions').bonus, 'simple');
  assert.equal(ids(rank('Spain, Visa, straightforward bonus conditions'))[0], 'playuzu');
});
test('rankings meaningfully change with preferences, never use original source position', () => {
  const a = rank('Spain, fast PayPal');
  const b = rank('Spain, fast Visa, simple bonus');
  assert.notDeepEqual(ids(a), ids(b));
  assert.equal(ids(b)[0], 'playuzu');
  const p = parsePreferences('Spain, fast Visa');
  assert.deepEqual(ids(rankOperators(operators, p)), ids(rankOperators(operators.slice().reverse(), p)));
  assert.ok(a.results.every(r => typeof r.score === 'number' && Array.isArray(r.matchedFields)));
});
test('game matches require verified category evidence and new-player preference never implies safety', () => {
  const r = rank('Spain, new player, roulette');
  assert.ok(r.results.some(result => result.matchedFields.includes('games')));
  for (const result of r.results) {
    if (result.matchedFields.includes('games')) assert.ok(result.operator.games.verified && result.operator.games.value.includes('roulette'));
    assert.match(result.matches.join(' '), /does not imply lower gambling risk/);
  }
});
test('follow-ups preserve earlier preferences and change only explicit inputs; arrays are copied', () => {
  const prev = parsePreferences('Spain, new player, fast PayPal, slots, no bonus, withdraw €15000');
  const next = parsePreferences('Instead use bank transfer', prev);
  assert.equal(next.country, 'ES');
  assert.equal(next.method, 'Bank transfer');
  assert.equal(next.amount, 15000);
  assert.equal(next.experience, 'new');
  assert.equal(next.bonus, 'none');
  assert.equal(next.fast, true);
  assert.deepEqual(prev.games, ['slots']);
  const cleared = parsePreferences('any amount, speed does not matter, any bonus, any games', next);
  assert.equal(cleared.amount, null);
  assert.equal(cleared.fast, false);
  assert.equal(cleared.bonus, 'any');
  assert.deepEqual(cleared.games, []);
  assert.deepEqual(prev.games, ['slots']);
  assert.deepEqual(ids(rankOperators(operators, next)), ['leovegas']);
});
test('underage and chasing-loss requests block recommendations and persist on follow-up', () => {
  for (const phrase of ["I'm 17 and live in Spain", 'Spain, under 18', 'Spain, need to win back my losses', 'Spain, I am self-excluded']) {
    const p = parsePreferences(phrase);
    assert.ok(p.blocked, phrase);
    const r = rankOperators(operators, p);
    assert.equal(r.results.length, 0);
    assert.ok(r.blocked);
    assert.equal(parsePreferences('Use Visa', p).blocked, p.blocked);
  }
  assert.equal(parsePreferences("I'm 25 in Spain").blocked, null);
});
test('matching does not mutate operator data or caller preferences', () => {
  const p = parsePreferences('Spain, fast Visa, simple bonus');
  const beforeOperators = JSON.stringify(operators), beforePrefs = JSON.stringify(p);
  rankOperators(operators, p);
  assert.equal(JSON.stringify(operators), beforeOperators);
  assert.equal(JSON.stringify(p), beforePrefs);
});
