/* Small local replacements for captured page interactions; no source-site scripts. */
(function () {
  'use strict';
  const source = document.querySelector('main');
  const nav = document.querySelector('[data-in-page-nav]');
  const backTop = document.querySelector('[aria-label="Back to Top"]');
  const drawer = document.getElementById('main-navigation-drawer');
  const openMenu = document.querySelector('[aria-label="Open navigation menu"]');
  function menu(open) {
    if (!drawer) return;
    drawer.classList.toggle('ci-original-menu-open',open);
    drawer.style.pointerEvents = open ? 'auto' : '';
    if (openMenu) openMenu.setAttribute('aria-expanded',String(open));
  }
  if(openMenu)openMenu.addEventListener('click',()=>menu(true));
  document.querySelectorAll('[aria-label="Close navigation menu"],[aria-label="Close navigation"]').forEach((button)=>button.addEventListener('click',()=>menu(false)));
  document.querySelectorAll('[role="menuitem"][aria-haspopup="menu"]').forEach((item)=>{
    const container=item.parentElement;
    container.className=container.className.replace(/NavigationItem_force-closed__\S+/g,'');
    function expand(open){item.setAttribute('aria-expanded',String(open));container.classList.toggle('ci-nav-expanded',open);container.querySelectorAll('[inert]').forEach((e)=>e.removeAttribute('inert'));}
    item.addEventListener('click',(e)=>{e.preventDefault();expand(item.getAttribute('aria-expanded')!=='true');});
    container.addEventListener('mouseenter',()=>{if(innerWidth>=1024)expand(true);});
    container.addEventListener('mouseleave',()=>{if(innerWidth>=1024)expand(false);});
    item.addEventListener('keydown',(e)=>{if(e.key==='Escape')expand(false);});
  });
  document.querySelectorAll('[class*="Accordion_header"][role="button"]').forEach((header)=>{
    const content=header.nextElementSibling;
    if(!content)return;
    function toggle(){const open=header.getAttribute('aria-expanded')!=='true';header.setAttribute('aria-expanded',String(open));content.classList.toggle('hidden',!open);content.style.display=open?'block':'';}
    header.addEventListener('click',toggle);
    header.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
  });
  document.querySelectorAll('button[aria-label="Open details"],button[aria-label="Hide details"]').forEach((button)=>{
    const reveal=button.parentElement.querySelector('[class*="MoreDetails_reveal"]');
    if(!reveal)return;
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Hide details':'Open details');
      const text=[...button.childNodes].find((n)=>n.nodeType===3&&n.textContent.trim());if(text)text.textContent=open?'Hide details':'More details';
      reveal.style.maxHeight=open?'380px':'0';reveal.style.height=open?'auto':'0';reveal.style.opacity=open?'1':'0';reveal.style.visibility=open?'visible':'hidden';
      reveal.className=reveal.className.replace(/MoreDetails_revealClosed__\S+/g,'');
      reveal.style.overflow=open?'auto':'hidden';
    });
  });
  document.querySelectorAll('button').forEach((button)=>{
    if(button.textContent.trim()==='Find my perfect casino')button.addEventListener('click',()=>window.CasinoIntelligence.open());
    if(button.textContent.trim()==='Skip to content')button.addEventListener('click',()=>document.getElementById('intro').scrollIntoView());
    if(button.getAttribute('aria-label')==='User menu')button.addEventListener('click',()=>window.CasinoIntelligence.showNotice('Account features are unavailable in this local prototype. No sign-in details are collected.'));
  });
  const brands=document.querySelector('[data-brand-selector-content]');
  document.querySelectorAll('[data-brand-selector-button]').forEach((button)=>button.addEventListener('click',()=>{if(!brands)return;const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));brands.style.display=open?'block':'';}));
  document.querySelectorAll('button[aria-label="right"],button[aria-label="left"]').forEach((button)=>{const container=button.parentElement;const track=[...container.querySelectorAll('div')].find((e)=>e.scrollWidth>e.clientWidth+10&&getComputedStyle(e).overflowX!=='visible');if(track)button.addEventListener('click',()=>track.scrollBy({left:button.getAttribute('aria-label')==='right'?290:-290,behavior:'smooth'}));});
  document.querySelectorAll('button[aria-label="Scroll navigation right"],button[aria-label="Scroll navigation left"]').forEach((button)=>button.addEventListener('click',()=>{const target=document.querySelector('[aria-label="Page sections navigation"]');if(target)target.scrollBy({left:button.getAttribute('aria-label').endsWith('right')?300:-300,behavior:'smooth'});}));
  if(backTop)backTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  function sticky(){
    const show=scrollY>325;
    if(nav){nav.style.setProperty('top',show?'0px':'-80px','important');nav.style.setProperty('opacity',show?'1':'0','important');nav.style.setProperty('pointer-events',show?'auto':'none','important');nav.style.setProperty('z-index',show?'49':'0','important');}
    if(backTop){backTop.style.opacity=scrollY>800?'1':'0';backTop.style.pointerEvents=scrollY>800?'auto':'none';}
  }
  window.addEventListener('scroll',sticky,{passive:true});sticky();
  window.addEventListener('resize',()=>{if(innerWidth>=1024)menu(false);});
  // The original bonus calculator remains an illustrative arithmetic interaction only.
  const bonusSection=document.getElementById('bonuses');
  if(bonusSection){
    const input=bonusSection.querySelector('input[type="number"]');
    if(input){
      input.setAttribute('aria-label','Illustrative bonus calculator amount');input.value='20';
      const amounts=[...bonusSection.querySelectorAll('button')].filter((b)=>/^€(?:20|50|100|200)$/.test(b.textContent.trim()));
      const originalParagraphs=[...bonusSection.querySelectorAll('p')];
      const summary=originalParagraphs.find((p)=>p.textContent.includes('as free money'));
      const valueParagraphs=originalParagraphs.filter((p)=>/^€\d+$/.test(p.textContent.trim()));
      function update(){const amount=Math.max(0,Math.min(10000,Number(input.value)||0));const bonus=Math.min(amount,200);if(summary)summary.textContent='Illustration: '+amount+'€ amount, '+bonus+'€ example bonus';if(valueParagraphs[0])valueParagraphs[0].textContent='€'+bonus;if(valueParagraphs[1])valueParagraphs[1].textContent='€'+(amount+bonus);}
      amounts.forEach((b)=>b.addEventListener('click',()=>{input.value=b.textContent.replace('€','');update();}));input.addEventListener('input',update);
    }
  }
  const countryTrigger=document.querySelector('footer [role="combobox"]');
  if(countryTrigger){const list=countryTrigger.nextElementSibling;if(list){list.style.display='none';countryTrigger.addEventListener('click',()=>{const show=list.style.display==='none';list.style.display=show?'block':'none';countryTrigger.setAttribute('aria-expanded',String(show));});}}
  document.querySelectorAll('[data-state="closed"]').forEach((node)=>{if(node.textContent.trim()==='T&Cs Apply'){node.addEventListener('click',()=>{if(node.querySelector('.ci-original-explanation'))return;const note=document.createElement('div');note.className='ci-original-explanation';note.textContent='Snapshot offer only. Current offer-specific eligibility, wagering and withdrawal terms are not verified in this prototype. Check the primary operator terms.';node.append(note);});}});
})();
