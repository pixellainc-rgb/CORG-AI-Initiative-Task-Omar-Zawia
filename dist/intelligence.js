/* Local Mode A UI. No model requests, remote scripts, account actions or affiliate URLs. */
(function () {
  'use strict';
  const data = window.CASINO_DATA;
  const matcher = window.CasinoMatcher;
  const $ = (id) => document.getElementById(id);
  const escape = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => '€' + Number(n).toLocaleString('en-GB');
  const field = (operator, key) => operator[key] && operator[key].verified && operator[key].value != null ? operator[key].value : null;
  const dialog = $('ci-assistant');
  const sessionId = (() => { try { let id = sessionStorage.getItem('ci-session'); if (!id) { id = 'demo-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)); sessionStorage.setItem('ci-session', id); } return id; } catch (_) { return 'demo-' + Date.now().toString(36); } })();
  let events = [];
  try { events = JSON.parse(localStorage.getItem('ci-events') || '[]'); if (!Array.isArray(events)) events = []; } catch (_) {}
  let preferences = matcher.parsePreferences('');
  let lastRun = null;
  let selected = new Set();
  let opener = null;
  let toastTimer;
  let conversationCount = 0;
  const operatorsById = new Map(data.operators.map((o) => [o.id, o]));
  const operatorsBySlug = new Map(data.operators.map((o) => [o.reference.sourceSlug, o]));
  const scenarioPrompts = {
    paypal: 'I’m in Spain. I prefer PayPal withdrawals and quick processing. Clear withdrawal and verification conditions matter to me.',
    simple: 'I’m a new player in Spain, using Visa. I prefer slots and simple bonus conditions. Speed is a preference, not a guarantee.',
    limits: 'I’m in Spain and want to compare published limits for a €15,000 withdrawal by bank transfer. Speed does not matter.',
    unsupported: 'I live in the United Kingdom and prefer PayPal withdrawals. Which of these operators has verified eligibility here?'
  };

  function track(name, properties = {}) {
    const event = { event: name, timestamp: new Date().toISOString(), sessionId, properties };
    events.push(event); events = events.slice(-500);
    try { localStorage.setItem('ci-events', JSON.stringify(events)); } catch (_) {}
    console.info('[Casino Intelligence demo]', event);
    updateEventCount();
    if ($('ci-analytics').open) renderAnalytics();
  }
  function updateEventCount() { $('ci-event-count').textContent = events.length; }
  function toast(text) { clearTimeout(toastTimer); $('ci-toast').textContent = text; $('ci-toast').classList.add('visible'); toastTimer = setTimeout(() => $('ci-toast').classList.remove('visible'), 2800); }
  function openAssistant() {
    opener = document.activeElement;
    dialog.showModal();
    track('ai_assistant_opened', {mode:'simulated', source:'reference_page', referenceCountry:'ES'});
    setTimeout(() => $('ci-prompt').focus(), 0);
  }
  function closeAssistant(reason = 'close_button') {
    if (!dialog.open) return;
    dialog.close();
    track('assistant_closed', {reason, shortlistGenerated:!!lastRun});
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  }
  function setView(view) {
    ['shortlist','comparison','methodology'].forEach((name) => { $('ci-' + name + '-view').hidden = name !== view; });
    document.querySelectorAll('.ci-tab').forEach((button) => button.classList.toggle('active',button.dataset.view === view));
    $('ci-workspace').classList.toggle('ci-full-view',view !== 'shortlist');
    if (view !== 'shortlist') { $('ci-workspace').scrollTop=0; $('ci-results-region').scrollTop=0; }
    if (view === 'comparison') { renderComparison(); track('casino_comparison_opened',{operatorIds:[...selected], count:selected.size}); }
  }
  function addMessage(text, type = 'assistant', extras = '') {
    const div = document.createElement('div');
    div.className = 'ci-message ci-' + type + '-message';
    if (type === 'assistant') div.innerHTML = '<span class="ci-message-glyph" aria-hidden="true">✦</span><div>' + escape(text) + extras + '</div>';
    else div.textContent = text;
    $('ci-conversation').append(div);
    conversationCount++;
    if (conversationCount > 8) { $('ci-conversation').firstElementChild.remove(); conversationCount--; }
  }
  function prefsChips() {
    const names = {ES:'Spain',GB:'United Kingdom',US:'United States',DE:'Germany',FR:'France',CA:'Canada'};
    const chips = [names[preferences.country] || preferences.country, preferences.method, preferences.experience === 'new' ? 'New player' : null, ...preferences.games];
    if (preferences.fast) chips.push(preferences.strictSpeed ? 'Strict timing requirement' : 'Quick processing preferred');
    if (preferences.bonus === 'simple') chips.push('Simple bonus conditions');
    if (preferences.bonus === 'none') chips.push('No bonus weighting');
    if (preferences.bonus === 'no-wagering') chips.push('Published no-wagering policy');
    if (preferences.amount != null) chips.push(money(preferences.amount) + ' withdrawal');
    if (preferences.minWithdrawal != null) chips.push('Minimum ≤ ' + money(preferences.minWithdrawal));
    return chips.filter(Boolean).map((s) => '<span>'+escape(s)+'</span>').join('');
  }
  function timingText(operator) {
    const value = field(operator,'withdrawalTiming');
    if (!value) return 'Not verified';
    const parts = [];
    if (value.processing) parts.push('Processing: ' + value.processing);
    if (value.operatorPublishedClaim) parts.push('Operator claim: ' + value.operatorPublishedClaim);
    if (value.settlement) parts.push(value.settlement);
    if (value.bankSettlement && /Bank|Trustly/.test(preferences.method || '')) parts.push('Bank settlement: ' + value.bankSettlement);
    const after = value.settlementAfterApproval;
    if (after) {
      const key = /Bank|Trustly/.test(preferences.method || '') ? 'bankTransfer' : /PayPal|Skrill|Neteller/.test(preferences.method || '') ? 'eWallets' : /Visa|Mastercard|Card/.test(preferences.method || '') ? 'cards' : null;
      if (key && after[key]) parts.push('After approval: ' + after[key]);
      else if (after.cardsAndListedWallets) parts.push('Cards/listed wallets after approval: ' + after.cardsAndListedWallets);
      else parts.push('Settlement varies by method; see evidence.');
    }
    return parts.join(' · ') || 'Not verified';
  }
  function limitText(operator) {
    const value = field(operator,'withdrawalLimits');
    if (!value) return 'Not verified';
    const parts = [];
    if (value.minimum != null) parts.push('Minimum ' + money(value.minimum));
    if (value.minimumByMethod) parts.push('Minimum: ' + Object.entries(value.minimumByMethod).map(([k,v]) => k + ' ' + money(v)).join('; '));
    if (value.maximumByMethod) {
      let entries = Object.entries(value.maximumByMethod);
      if (preferences.method) { const relevant = entries.filter(([key]) => key.toLowerCase().includes(preferences.method.toLowerCase()) || (/Visa|Mastercard/.test(preferences.method) && /Visa|Mastercard/.test(key)) || (preferences.method === 'Bank transfer' && /bank transfer/i.test(key))); if (relevant.length) entries = relevant; }
      parts.push('Published maximum: ' + entries.map(([k,v]) => k + ' ' + money(v)).join('; '));
    } else parts.push('Maximum not verified');
    if (value.period) parts.push('Period: ' + value.period);
    return parts.join(' · ');
  }
  function bonusText(operator) {
    const value = field(operator,'bonus');
    if (!value) return 'Current offer-specific conditions not verified';
    if (typeof value === 'string') return value;
    return (value.operatorPolicy || 'Not verified') + '. Individual offer eligibility and other conditions still need checking.';
  }
  function sourceLinks(operator, keys) {
    const urls = [...new Set(keys.flatMap((k) => operator[k] && operator[k].verified ? operator[k].sourceUrls || [] : []))];
    return urls.map((url) => {
      const source = data.sources.find((s) => s.url.replace(/\/$/,'') === url.replace(/\/$/,''));
      const title = source ? source.title : new URL(url).hostname;
      return '<a class="ci-source-link" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer" data-evidence="'+operator.id+'">'+escape(title)+' ↗<span>30 Oct 2026</span></a>';
    }).join('');
  }
  function buildCard(result, index) {
    const o = result.operator;
    const methods = field(o,'withdrawalMethods');
    const verification = field(o,'verification');
    return '<article class="ci-shortlist-card" data-operator="'+o.id+'">' +
      '<div class="ci-card-top"><img class="ci-operator-logo" data-id="'+o.id+'" src="'+escape(o.logo.value)+'" alt="'+escape(o.name)+' logo"><div><h4>'+escape(o.name)+(index===0?'<span class="ci-match-badge">CLOSEST ALIGNMENT</span>':'')+'</h4><p>Source ranking #'+o.ranking.value+' · Spanish domain evidence</p></div><label class="ci-compare-label"><input type="checkbox" data-compare-id="'+o.id+'" '+(selected.has(o.id)?'checked':'')+'> Compare</label></div>' +
      '<div class="ci-card-body"><ul class="ci-match-reasons">'+result.matches.filter((s)=>!s.startsWith('Jurisdiction evidence')).slice(0,2).map((s)=>'<li>'+escape(s)+'</li>').join('')+'</ul>' +
      '<div class="ci-withdrawal-box"><div><span class="ci-field-label">PUBLISHED WITHDRAWAL TIMING</span><span class="ci-field-value">'+escape(timingText(o))+'</span></div><div><span class="ci-field-label">VERIFIED WITHDRAWAL METHODS</span><span class="ci-field-value">'+escape(methods ? methods.join(' · ') : 'Not verified')+'</span></div><div><span class="ci-field-label">WITHDRAWAL LIMITS</span><span class="ci-field-value">'+escape(limitText(o))+'</span></div><div><span class="ci-field-label">VERIFICATION</span><span class="ci-field-value">'+escape(typeof verification==='string'?verification:'Not verified')+'</span></div></div>' +
      '<p class="ci-card-caution"><span aria-hidden="true">ⓘ</span><span><b>What to consider:</b> '+escape(result.cautions.slice(0,2).join(' '))+'</span></p>' +
      '<div class="ci-card-actions"><button class="ci-secondary" data-explain="'+o.id+'" aria-expanded="false">Why this match?</button><button class="ci-secondary" data-evidence-toggle="'+o.id+'" aria-expanded="false">Evidence ↗</button><button class="ci-secondary" data-listing="'+o.id+'">View listing ↓</button><button class="ci-primary" data-demo-operator="'+o.reference.sourceSlug+'">Visit Casino · Demo ↗</button></div></div>' +
      '<div class="ci-card-expanded" id="ci-explain-'+o.id+'" hidden><h5>Why this casino appears here</h5><ul>'+result.matches.map((s)=>'<li>'+escape(s)+'</li>').join('')+'</ul><h5>Conditions and information gaps</h5><p>'+escape(bonusText(o))+'</p><ul>'+[...result.cautions,...o.missingData].filter((v,i,a)=>a.indexOf(v)===i).map((s)=>'<li>'+escape(s)+'</li>').join('')+'</ul><p>These reasons describe published information for '+escape(o.officialDomain.value)+'. Account approval, residence/location, age and exclusion conditions still apply.</p></div>' +
      '<div class="ci-card-expanded" id="ci-evidence-'+o.id+'" hidden><h5>Primary evidence · accessed 30 Oct 2026</h5>'+sourceLinks(o,['jurisdiction','withdrawalMethods','withdrawalTiming','withdrawalLimits','verification','bonus','games'])+'<a class="ci-source-link" href="'+escape(o.reference.sourceUrl)+'#toplist" target="_blank" rel="noopener noreferrer" data-evidence="'+o.id+'">Casino.org source listing ↗<span>Captured snapshot</span></a><p>Operator-specific Casino.org review URL: Not verified. No review URL has been guessed. Source estimates and operator claims were not independently payout-tested.</p></div></article>';
  }
  function renderResults(run) {
    $('ci-welcome').hidden = true;
    $('ci-followup-form').hidden = false;
    selected = new Set(run.results.map((r)=>r.operator.id));
    updateCompareCount();
    $('ci-summary').innerHTML = '<div class="ci-result-heading"><div><h3>'+(run.results.length ? run.results.length+' evidence-led option'+(run.results.length===1?'':'s') : 'No verified match for this request')+'</h3><p>'+(run.results.length ? 'Ordered by your preferences, with the original rankings kept intact.' : 'Unknown information cannot satisfy a requirement.')+'</p><div class="ci-pref-chips">'+prefsChips()+'</div></div>'+(run.results.length?'<button class="ci-secondary" data-open-compare>Compare '+run.results.length+' →</button>':'')+'</div>';
    if (run.results.length) $('ci-shortlist').innerHTML = run.results.map(buildCard).join('');
    else {
      const reasons = [...new Set(run.excluded.map((e)=>e.reason))];
      const note = preferences.country && preferences.country !== 'ES' ? 'Only Spanish-domain jurisdiction evidence was captured. These operators are not presented as eligible in your selected country.' : preferences.avoidVerification ? 'No operator in this dataset has verified identity-free withdrawals. Verification can be required, and delays cannot be ruled out.' : preferences.strictSpeed ? 'The sources do not establish a guaranteed end-to-end payout within your requested time. Processing and settlement are separate.' : run.blocked || run.summary;
      $('ci-shortlist').innerHTML = '<div class="ci-no-results"><h3>'+escape(run.blocked?'Recommendations unavailable':'Evidence is more useful than a guess.')+'</h3><p>'+escape(note)+'</p>'+(reasons.length?'<ul>'+reasons.slice(0,3).map((r)=>'<li>'+escape(r)+'</li>').join('')+'</ul>':'')+'<p>You can change your actual preferences or inspect the original listings. Missing evidence is not proof that a casino does or does not support a feature.</p><button class="ci-secondary" data-return-rankings>View original rankings ↓</button></div>';
    }
  }
  function collectPreferences(text, reset) {
    const previous = reset ? {} : preferences;
    const parsed = matcher.parsePreferences(text, previous);
    // An explicit form selection is the current country; free text may supply it when blank.
    const explicit = matcher.parsePreferences(text);
    const hasLocationStatement = /\b(?:i (?:live|reside|am based)|i.m based|my country is)\b/i.test(text);
    if (explicit.country) parsed.country = explicit.country;
    else if (hasLocationStatement) { parsed.country = null; $('ci-country').value = ''; }
    else if ($('ci-country').value) parsed.country = $('ci-country').value;
    if ($('ci-experience').value) parsed.experience = $('ci-experience').value;
    if ($('ci-method').value) parsed.method = $('ci-method').value;
    if ($('ci-game').value) parsed.games = [$('ci-game').value];
    return parsed;
  }
  function runComparison(text, reset = true, via = 'preferences') {
    preferences = via === 'followup' ? matcher.parsePreferences(text, preferences) : collectPreferences(text, reset);
    if (preferences.country && [...$('ci-country').options].some((o)=>o.value === preferences.country)) $('ci-country').value = preferences.country;
    track('user_preferences_submitted',{country:preferences.country,method:preferences.method,experience:preferences.experience,bonusPreference:preferences.bonus,games:preferences.games,hasAmountRequirement:preferences.amount!=null,strictSpeed:preferences.strictSpeed,via});
    setView('shortlist');
    if (reset) { $('ci-conversation').innerHTML = ''; conversationCount=0; }
    if (text.trim()) addMessage(text,'user');
    const run = matcher.rankOperators(data.operators,preferences);
    if (run.needsCountry && !run.blocked) {
      $('ci-welcome').hidden=true; $('ci-summary').innerHTML=''; $('ci-shortlist').innerHTML=''; $('ci-followup-form').hidden=false;
      addMessage('Which country will you play from? I need jurisdiction evidence before I can create a shortlist. This captured dataset supports Spain only.','assistant','<div class="ci-country-choices"><button class="ci-secondary" data-country-answer="ES">Spain</button><button class="ci-secondary" data-country-answer="GB">United Kingdom</button><button class="ci-secondary" data-country-answer="OTHER">Another country</button></div>');
      selected.clear(); updateCompareCount(); lastRun=run; return;
    }
    lastRun=run;
    addMessage(run.results.length ? 'I compared published attributes against your priorities. Here are the closest evidenced options, including the conditions and gaps worth checking.' : run.summary);
    renderResults(run);
    track('ai_shortlist_generated',{operatorIds:run.results.map((r)=>r.operator.id),count:run.results.length,excludedCount:run.excluded.length,country:preferences.country,mode:'deterministic',noMatch:run.results.length===0});
    requestAnimationFrame(()=>{ if(innerWidth<761) $('ci-summary').scrollIntoView({behavior:'smooth',block:'start'}); else $('ci-results-region').scrollTo({top:0,behavior:'smooth'}); });
  }
  function updateCompareCount() { $('ci-compare-count').textContent=selected.size; }
  function renderComparison() {
    const operators = [...selected].map((id)=>operatorsById.get(id)).filter(Boolean);
    if (!operators.length) { $('ci-comparison-content').innerHTML='<div class="ci-no-results"><h3>Choose options to compare</h3><p>Generate a shortlist and select up to three casinos using the Compare checkboxes.</p><button class="ci-secondary" data-show-shortlist>Back to shortlist</button></div>'; return; }
    const rows = [
      ['Why it appears', (o)=>lastRun.results.find((r)=>r.operator.id===o.id).matches.join(' ')],
      ['Jurisdiction evidence', (o)=>'Spain · '+o.officialDomain.value+' · individual approval not established'],
      ['Withdrawal methods', (o)=>(field(o,'withdrawalMethods')||['Not verified']).join(', ')],
      ['Processing & settlement', timingText],
      ['Withdrawal limits',limitText],
      ['Verification',(o)=>typeof field(o,'verification')==='string'?field(o,'verification'):'Not verified'],
      ['Bonus conditions',bonusText],
      ['Games',(o)=>(field(o,'games')||['Not verified']).join(', ')],
      ['What to consider',(o)=>lastRun.results.find((r)=>r.operator.id===o.id).cautions.slice(0,3).join(' ')],
      ['Evidence',(o)=>sourceLinks(o,['jurisdiction','withdrawalTiming','withdrawalLimits'])],
      ['Original listing',(o)=>'<button class="ci-text-button" data-listing="'+o.id+'">View source rank #'+o.ranking.value+' ↓</button>'],
      ['Demonstration action',(o)=>'<button class="ci-primary" data-demo-operator="'+o.reference.sourceSlug+'">Visit Casino · Demo ↗</button>']
    ];
    $('ci-comparison-content').innerHTML='<div class="ci-table-scroll" tabindex="0" aria-label="Scroll casino comparison horizontally"><table class="ci-compare-table"><thead><tr><th>Compare the details</th>'+operators.map((o)=>'<th scope="col"><img src="'+escape(o.logo.value)+'" alt="'+escape(o.name)+' logo"><br>'+escape(o.name)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(([title,render])=>'<tr><th scope="row">'+title+'</th>'+operators.map((o)=>'<td>'+(title==='Evidence'||title==='Original listing'||title==='Demonstration action'?render(o):escape(render(o)))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  function findReferencedResult(question) {
    const q=question.toLowerCase();
    return lastRun && lastRun.results.find((r)=>q.includes(r.operator.name.toLowerCase()) || q.includes(r.operator.id) || q.includes(r.operator.name.toLowerCase().replace(' casino','')));
  }
  function answerFollowup(question) {
    if (!question.trim()) return;
    const q=question.toLowerCase();
    const explanatory=/\bwhy\b|recommend|verified|evidence|difference|compare these|drawback|clearer|conditions|what.*consider|limitations|sources/.test(q);
    if (!lastRun || !lastRun.results.length || !explanatory || /\b(?:instead|switch|change|i(?:'m| am)|i live|i prefer|use .* instead|actually)\b/.test(q)) { runComparison(question,false,'followup'); $('ci-followup-input').value=''; return; }
    addMessage(question,'user');
    const chosen=findReferencedResult(question);
    const results=chosen?[chosen]:lastRun.results;
    let response='';
    if (/difference|compare/.test(q)) {
      response=results.map((r)=>r.operator.name+': '+r.matches.slice(0,2).join(' ')+' '+r.cautions[0]).join(' ');
      response+=' Open the side-by-side comparison to inspect timing, limits and conditions together.';
    } else if (/verified|evidence|sources/.test(q)) {
      response=results.map((r)=>{const o=r.operator;const known=['jurisdiction','withdrawalMethods','withdrawalTiming','withdrawalLimits','verification','bonus','games'].filter((k)=>field(o,k)!=null);return o.name+': published evidence is available for '+known.map((k)=>k.replace(/([A-Z])/g,' $1').toLowerCase()).join(', ')+'. Missing: '+o.missingData.slice(0,2).join('; ')+'.';}).join(' ');
      response+=' Verified here means a source was checked, not that a withdrawal was tested.';
    } else if (/drawback|consider|limitation/.test(q)) response=results.map((r)=>r.operator.name+': '+r.cautions.slice(0,2).join(' ')).join(' ');
    else if (/clearer|conditions/.test(q)) {
      response=results.map((r)=>r.operator.name+': '+limitText(r.operator)+'. '+bonusText(r.operator)).join(' ');
      response+=' More published detail makes a condition easier to inspect; it does not prove the operator pays faster or is suitable for you.';
    } else response=results.map((r)=>r.operator.name+' matches because '+r.matches.join(' ')+' Main consideration: '+r.cautions[0]).join(' ');
    const links=results.map((r)=>'<a href="'+escape(r.operator.withdrawalTiming.sourceUrls[0]||r.operator.jurisdiction.sourceUrls[0])+'" target="_blank" rel="noopener noreferrer" data-evidence="'+r.operator.id+'">'+escape(r.operator.name)+' source ↗</a>').join(' · ');
    addMessage(response,'assistant','<p style="margin-top:8px">'+links+'</p>');
    track('recommendation_explanation_viewed',{operatorIds:results.map((r)=>r.operator.id),type:'followup',category:/verified/.test(q)?'verified':/drawback/.test(q)?'drawbacks':'explanation'});
    $('ci-followup-input').value='';
    $('ci-conversation').lastElementChild.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function goToListing(id) {
    const o=operatorsById.get(id); if(!o)return;
    closeAssistant('view_listing');
    const listing=$(o.listingId);
    if(listing){document.querySelectorAll('.ci-listing-highlight').forEach((e)=>e.classList.remove('ci-listing-highlight'));listing.classList.add('ci-listing-highlight');listing.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>listing.classList.remove('ci-listing-highlight'),6500);}
    track('casino_selected',{operatorId:id,action:'view_original_listing',sourceRank:o.ranking.value});
  }
  function returnRankings() {closeAssistant('return_to_rankings');$('toplist').scrollIntoView({behavior:'smooth',block:'start'});}
  function demoVisit(slug) {
    const o=operatorsBySlug.get(slug); const name=o?o.name:'the selected casino';
    $('ci-visit-copy').textContent='You selected '+name+'. In production, an eligible, consent-aware clickout would be measured here. This demo stops at this confirmation.';
    $('ci-demo-visit').showModal();
    track('casino_selected',{operatorId:o?o.id:slug,action:'demo_visit',realClickout:false});
  }
  function renderAnalytics() {
    const count=(name)=>events.filter((e)=>e.event===name).length;
    $('ci-analytics-metrics').innerHTML=[['Assistant opens',count('ai_assistant_opened')],['Shortlists generated',count('ai_shortlist_generated')],['Comparisons opened',count('casino_comparison_opened')],['Demo selections',count('casino_selected')]].map(([label,value])=>'<div><strong>'+value+'</strong><span>'+label+'</span></div>').join('');
    $('ci-session-label').textContent='Session: '+sessionId;
    $('ci-event-rows').innerHTML=events.slice().reverse().map((e)=>'<tr><td>'+escape(new Date(e.timestamp).toLocaleTimeString())+'</td><td>'+escape(e.event)+'</td><td>'+escape(JSON.stringify(e.properties))+'</td></tr>').join('')||'<tr><td colspan="3">No events yet. Open the assistant to start the demonstration.</td></tr>';
  }
  function openAnalytics(){renderAnalytics();$('ci-analytics').showModal();}
  $('ci-launch').addEventListener('click',openAssistant);
  $('ci-close').addEventListener('click',()=>closeAssistant());
  dialog.addEventListener('cancel',(e)=>{e.preventDefault();closeAssistant('escape');});
  dialog.addEventListener('click',(e)=>{if(e.target===dialog)closeAssistant('backdrop');});
  $('ci-preference-form').addEventListener('submit',(e)=>{e.preventDefault();runComparison($('ci-prompt').value,true);});
  $('ci-followup-form').addEventListener('submit',(e)=>{e.preventDefault();answerFollowup($('ci-followup-input').value);});
  $('ci-return-rankings').addEventListener('click',returnRankings);
  $('ci-back-shortlist').addEventListener('click',()=>setView('shortlist'));
  $('ci-analytics-launch').addEventListener('click',openAnalytics);
  $('ci-open-analytics-methodology').addEventListener('click',openAnalytics);
  $('ci-close-analytics').addEventListener('click',()=>$('ci-analytics').close());
  $('ci-visit-done').addEventListener('click',()=>$('ci-demo-visit').close());
  $('ci-clear-analytics').addEventListener('click',()=>{events=[];try{localStorage.removeItem('ci-events');}catch(_){}updateEventCount();renderAnalytics();});
  $('ci-export-analytics').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({prototype:true,mode:'local',sessionId,events},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='casino-intelligence-demo-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.addEventListener('click',(e)=>{
    const button=e.target.closest('button,a'); if(!button)return;
    if(button.dataset.view){setView(button.dataset.view);return;}
    if(button.dataset.scenario){$('ci-country').value='';$('ci-method').value='';$('ci-game').value='';$('ci-experience').value='';$('ci-prompt').value=scenarioPrompts[button.dataset.scenario];runComparison($('ci-prompt').value,true,'scenario');return;}
    if(button.dataset.countryAnswer){preferences.country=button.dataset.countryAnswer;$('ci-country').value=button.dataset.countryAnswer;runComparison('',false,'followup');return;}
    if(button.dataset.question){answerFollowup(button.dataset.question);return;}
    if(button.hasAttribute('data-open-compare')){setView('comparison');return;}
    if(button.hasAttribute('data-show-shortlist')){setView('shortlist');return;}
    if(button.hasAttribute('data-return-rankings')){returnRankings();return;}
    if(button.dataset.explain){const area=$('ci-explain-'+button.dataset.explain);area.hidden=!area.hidden;button.setAttribute('aria-expanded',String(!area.hidden));if(!area.hidden)track('recommendation_explanation_viewed',{operatorId:button.dataset.explain,type:'card'});return;}
    if(button.dataset.evidenceToggle){const area=$('ci-evidence-'+button.dataset.evidenceToggle);area.hidden=!area.hidden;button.setAttribute('aria-expanded',String(!area.hidden));if(!area.hidden)track('recommendation_explanation_viewed',{operatorId:button.dataset.evidenceToggle,type:'evidence_panel'});return;}
    if(button.dataset.evidence){track('evidence_link_clicked',{operatorId:button.dataset.evidence,sourceUrl:button.href});return;}
    if(button.dataset.listing){goToListing(button.dataset.listing);return;}
    if(button.dataset.demoOperator){e.preventDefault();demoVisit(button.dataset.demoOperator);}
  });
  document.addEventListener('change',(e)=>{const id=e.target.dataset.compareId;if(!id)return;if(e.target.checked){if(selected.size>=3){e.target.checked=false;toast('You can compare up to three options.');return;}selected.add(id);}else selected.delete(id);updateCompareCount();});
  window.CasinoIntelligence={track,open:openAssistant,close:closeAssistant,showListing:goToListing,demoVisit,showNotice:toast,getEvents:()=>events.slice(),getPreferences:()=>({...preferences}),getResults:()=>lastRun,scenarios:{...scenarioPrompts}};
  updateEventCount();
})();
