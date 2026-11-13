// Optional: node tests/deduction-calculators-dom.test.js /absolute/path/to/jsdom
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require(process.argv[2] || 'jsdom');
const root = path.resolve(__dirname, '..');
const settle = () => new Promise(resolve => setImmediate(resolve));
const cases = [
 ['mortgage-interest-deduction-calculator', 'mortgage', { worker:'yes', house:'yes', household:'yes', houses:'one', owner:'yes', lender:'yes', acquired:'2025-06-10', registered:'2025-06-10', loan:'2025-06-10', value:550000000, term:30, fixed:'yes', amortizing:'yes', interest:12000000, otherDeductions:0 }],
 ['medical-tax-credit-calculator','medical', { salary:50000000, eligibility:'yes', generalPaid:4000000, generalRefunded:1000000 }],
 ['health-insurance-dependent-calculator','health', { confirmed:'yes', support:'yes', pension:18000000, financial:2000000, salary:0, business:0, other:0, property:400000000, businessKind:'none', exemption:'no', married:'no' }]
];
(async () => {
 for (const [slug,type,example] of cases) {
  const errors=[],downloads=[],shares=[],alerts=[];
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(fs.readFileSync(path.join(root,slug+'.html'),'utf8'),{url:'https://www.taxyou.co.kr/'+slug+'.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,d=w.document;
  const style=d.createElement('style');style.textContent=fs.readFileSync(path.join(root,'style.css'),'utf8');d.head.append(style);
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=message=>alerts.push(message);w.console.error=e=>errors.push(e.message);
  w.html2canvas=async element=>{
   assert.equal(element.id,'captureArea');assert.ok(element.querySelector('#resultTableBody').textContent.trim());
   return {width:900,height:3200,toBlob:cb=>cb(new w.Blob(['png'],{type:'image/png'})),toDataURL:()=> 'data:image/png;base64,cG5n'};
  };
  w.jspdf={jsPDF:class{constructor(){this.internal={pageSize:{getWidth:()=>210,getHeight:()=>297}};}addImage(){}addPage(){}output(){return new w.Blob(['pdf'],{type:'application/pdf'});}}};
  w.navigator.canShare=()=>true;w.navigator.share=async data=>shares.push(data);
  for(const script of d.querySelectorAll('script[src^="scripts/"]'))w.eval(fs.readFileSync(path.join(root,script.getAttribute('src').split('?')[0]),'utf8'));
  w.downloadBlob=(blob,name)=>downloads.push({type:blob.type,name});
  await new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve,{once:true}));await settle();
  const form=d.querySelector('form[data-deduction-tool]'),error=d.getElementById(type+'Error'),box=d.getElementById('resultBox');
  const get=name=>form.elements.namedItem(name);
  const set=(name,value)=>{const el=get(name);assert.ok(el,name);if(el.type==='checkbox')el.checked=value;else el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const text=()=>d.getElementById('resultTableBody').textContent;
  const visible=()=>box.style.display==='block';
  const checkError=hidden=>{assert.equal(error.hidden,hidden);assert.equal(w.getComputedStyle(error).display==='none',hidden);};
  assert.deepEqual(errors,[]);checkError(true);
  assert.equal(d.querySelectorAll('#resultBox').length,1);
  for(const el of form.querySelectorAll('input,select'))assert.ok(el.labels.length,el.id);
  // Do not let plausible defaults stand in for a user's actual loan/tax/spouse amounts.
  if(type==='mortgage'){
   assert.equal(get('term').value,'');assert.equal(get('interest').value,'');
   assert.equal(form.checkValidity(),false);
  }
  if(type==='health')assert.ok(get('confirmed').compareDocumentPosition(get('property')) & w.Node.DOCUMENT_POSITION_PRECEDING, 'confirm data after reviewing amounts');
  for(const [name,value] of Object.entries(example))set(name,value);
  assert.ok(form.checkValidity());submit();assert.ok(visible());assert.match(text(),/입력 기준 요건 충족/);checkError(true);assert.equal(d.activeElement,box);
  if(type==='mortgage')assert.match(text(),/12,000,000 원/);
  if(type==='medical')assert.match(text(),/225,000 원/);
  if(type==='health')assert.match(text(),/20,000,000 원/);
  const labels=()=>[...d.querySelectorAll('#resultTableBody tr td:first-child')].map(el=>el.textContent);
  if(type==='mortgage')assert.equal(labels()[1],'입력 기준 주담대 이자 소득공제액', 'show the answer before calculation detail');
  if(type==='medical'){
   assert.equal(labels()[1],'입력 기준 의료비 세액공제 · 국세');
   assert.equal(labels().includes('남은 소득세 한도 반영 가능액'),false,'omit unselected optional tax comparison');
   assert.equal(labels().some(label=>label.startsWith('미숙아·선천성이상아')),false,'omit unused medical breakdowns');
   const refundLabels=[...form.querySelectorAll('[name$="Refunded"]')].map(el=>el.labels[0].textContent);
   assert.equal(new Set(refundLabels).size,4,'refund controls need distinct accessible names');
  }
  // Verify production export wiring without installing those libraries in the site.
  w.html2canvas=async element=>{assert.equal(element.id,'captureArea');assert.match(element.querySelector('#resultTableBody').textContent,/입력 기준 요건 충족/);return {width:900,height:3200,toBlob:cb=>cb(new w.Blob(['png'],{type:'image/png'})),toDataURL:()=> 'data:image/png;base64,cG5n'};};
  for(const id of ['downloadImgBtn','downloadPdfBtn','sharePngBtn']){d.getElementById(id).click();await settle();}
  assert.deepEqual(downloads.map(row=>row.type),['image/png','application/pdf']);assert.equal(shares.length,1);assert.equal(shares[0].files[0].type,'image/png');assert.deepEqual(alerts,[]);
  w.navigator.canShare=()=>false;d.getElementById('sharePngBtn').click();await settle();assert.equal(downloads.length,3);assert.match(alerts.pop(),/공유를 지원하지 않아/);
  if(type==='mortgage'){
   set('houses','multiple');assert.equal(visible(),false);submit();assert.match(text(),/요건 미충족/);assert.match(d.getElementById('formulaContent').textContent,/2주택/);
   set('houses','one');set('owner','unknown');submit();assert.match(text(),/추가 확인 필요/);assert.match(text(),/확정하지 않음/);
   set('owner','yes');set('loan','2025-09-11');submit();assert.match(text(),/요건 미충족/);set('specialCase',true);submit();assert.match(text(),/추가 확인 필요/);set('specialCase',false);
   set('loan','2025-06-10');get('value').value='bad';submit();checkError(false);assert.equal(visible(),false);assert.equal(d.activeElement,error);
   set('value',550000000);checkError(true);submit();assert.ok(visible());
  }else if(type==='medical'){
   assert.equal(get('taxRemaining').disabled,true);assert.equal(w.getComputedStyle(d.querySelector('[data-tax-limit]')).display,'none');
   set('useTaxLimit',true);assert.equal(get('taxRemaining').disabled,false);assert.equal(get('taxRemaining').value,'');assert.equal(form.checkValidity(),false);set('taxRemaining',100000);submit();assert.match(text(),/100,000 원/);
   set('useTaxLimit',false);assert.equal(get('taxRemaining').disabled,true);
   set('generalRefunded',4000001);submit();checkError(false);assert.match(error.textContent,/일반 부양가족/);assert.equal(visible(),false);assert.equal(d.activeElement,error);
   set('generalRefunded',4000000);checkError(true);submit();assert.match(text(),/국세/);assert.match(d.getElementById('formulaContent').textContent,/실제 부담액이 없어/);
   set('generalRefunded',3000000);submit();assert.match(d.getElementById('formulaContent').textContent,/3% 이하라/);
   set('eligibility','no');submit();assert.match(text(),/대상 아닌 금액 제외 후 재계산/);
   set('eligibility','unknown');submit();assert.match(text(),/추가 확인 필요/);set('eligibility','yes');set('generalRefunded',1000000);
  }else{
   assert.equal(get('spouseIncome').disabled,true);assert.equal(w.getComputedStyle(d.querySelector('[data-spouse]')).display,'none');
   set('confirmed','unknown');submit();assert.match(text(),/추가 확인 필요/);set('confirmed','yes');
   set('property',600000000);submit();assert.match(text(),/요건 미충족/);assert.match(text(),/소득 상한 초과액10,000,000 원/);assert.equal(labels()[1],'우선 확인할 사항');assert.match(d.getElementById('formulaContent').textContent,/1,000만원/);set('property',400000000);
   set('married','yes');assert.equal(get('spouseIncome').disabled,false);assert.equal(get('spouseIncome').value,'');assert.equal(form.checkValidity(),false);set('spouseIncome',20000001);submit();assert.match(text(),/요건 미충족/);
   set('spouseIncome',0);set('spouseBusiness',1);submit();checkError(false);assert.equal(visible(),false);
   set('married','no');checkError(true);assert.equal(get('spouseBusiness').disabled,true);submit();assert.match(text(),/요건 충족/);
   set('businessKind','registered');set('business',1);submit();assert.match(text(),/요건 미충족/);set('business',0);
  }
  set('specialCase',true);submit();assert.match(text(),/추가 확인 필요/);set('specialCase',false);
  submit();assert.ok(visible());form.dispatchEvent(new w.Event('invalid',{bubbles:false}));assert.equal(visible(),false);
  await settle();assert.deepEqual(errors,[],slug);assert.deepEqual(alerts,[]);dom.window.close();
 }
 console.log('DEDUCTION_CALCULATORS_DOM_VALID pages=3 input branches, errors hidden, validation, result freshness, PNG/PDF/share');
})().catch(error=>{console.error(error);process.exitCode=1;});
