/* Breadth Lab — pure front-end; NEVER put API tokens in this file. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const set = (id, value) => { const n = $(id); if (n) n.textContent = value; };
  const formatNum = (n, digits = 0) => Number(n || 0).toLocaleString('zh-CN', {minimumFractionDigits:digits,maximumFractionDigits:digits});
  const pct = (x) => `${formatNum(x, 2)}%`;
  const div = (a,b) => b ? a/b : null;
  const pctOf = (a,b) => b ? (a/b*100) : 0;
  const smallUnit = (n) => {
    if (n >= 1e12) return `${formatNum(n/1e12,2)}万亿`;
    if (n >= 1e8) return `${formatNum(n/1e8,2)}亿`;
    if (n >= 1e4) return `${formatNum(n/1e4,2)}万`;
    return formatNum(n);
  };
  const readableDate = (s) => s ? `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}` : '未标注日期';
  const fallbackDemo = {
    trade_date: null,is_sample:true,total:5222,up:297,down:4895,flat:30,
    up_volume:226709892,down_volume:829854471,flat_volume:14385025,total_volume:1070949388,
    up_amount:257382877305,down_amount:1158368081000,flat_amount:5513933536,total_amount:1421264891841
  };
  const state = {history:[], sample:true, period:'20',metric:'down_ratio',updatedAt:null};
  const chartMetrics = {
    down_ratio: {label:'下跌家数占比',unit:'%',color:'#24d7a2',get:(r)=>pctOf(r.down,r.total)},
    adr: {label:'涨跌家数比 A/D',unit:'%',color:'#ff6373',get:(r)=>pctOf(r.up,r.down)},
    trin_volume: {label:'TRIN-量',unit:'',color:'#a79cff',get:(r)=>trin(r,'volume')},
    trin_amount: {label:'TRIN-额',unit:'',color:'#69a9ff',get:(r)=>trin(r,'amount')}
  };
  function trin(row,key){
    const up = Number(row[`up_${key}`]);const down = Number(row[`down_${key}`]);
    return div(div(row.up,row.down), div(up,down));
  }
  const validRow = (r) => r && Number.isFinite(+r.total) && +r.total > 0 && +r.up >= 0 && +r.down >= 0 && +r.flat >= 0;
  function drawSegments(container, up, flat, down) {
    if (!container) return;
    container.replaceChildren();
    for (const [part,color] of [[up,'seg-up'],[flat,'seg-flat'],[down,'seg-down']]) {
      const item = document.createElement('span');item.className=color;item.style.width=`${Math.max(0,part)}%`;container.append(item);
    }
  }
  function renderMain(r) {
    const total = +r.total;const up = +r.up;const down = +r.down;const flat = +r.flat;
    const upPct = pctOf(up,total),downPct=pctOf(down,total),flatPct=pctOf(flat,total);
    set('asofDate',r.is_sample ? '截图示例' : readableDate(r.trade_date));
    set('asofSub',r.is_sample ? '原截图没有交易日期 · 仅供展示' : '交易日收盘行情 · 北京时间');
    set('sessionStatus',r.is_sample ? '演示数据' : '已发布交易日数据');
    set('totalCount',formatNum(total));set('upCount',formatNum(up));set('downCount',formatNum(down));set('flatCount',formatNum(flat));
    set('upPct',pct(upPct));set('downPct',pct(downPct));set('flatPct',pct(flatPct));
    set('donutPct',pct(downPct));set('breadthLabel',`下跌 ${formatNum(down)} 家`);
    set('legendUpNum',formatNum(up));set('legendDownNum',formatNum(down));set('legendFlatNum',formatNum(flat));
    set('legendUpPct',pct(upPct));set('legendDownPct',pct(downPct));set('legendFlatPct',pct(flatPct));
    $('breadthDonut').style.background = `conic-gradient(var(--red) 0% ${upPct}%,var(--amber) ${upPct}% ${upPct+flatPct}%,var(--green) ${upPct+flatPct}% 100%)`;
    $('meterUp').style.width=`${upPct}%`;$('meterFlat').style.width=`${flatPct}%`;$('meterDown').style.width=`${downPct}%`;
    set('breadthSummary',`下跌家数是上涨家数的 ${up ? formatNum(down/up,1) : '—'} 倍 · 有效股票数不包含停牌无日线的股票`);
    const adr=pctOf(up,down);
    $('adrDisplay').replaceChildren(document.createTextNode(formatNum(upPct,2)));const unit=document.createElement('span');unit.textContent='%';$('adrDisplay').append(unit);
    set('adrPer100',pct(adr));
    set('totalVolume',`${smallUnit(+r.total_volume)} 手`);
    const vUp=pctOf(r.up_volume,r.total_volume),vDown=pctOf(r.down_volume,r.total_volume),vFlat=pctOf(r.flat_volume,r.total_volume);
    drawSegments($('volumeBar'),vUp,vFlat,vDown);
    set('upVolumePct',pct(vUp));set('downVolumePct',pct(vDown));set('upVolume',`${smallUnit(+r.up_volume)} 手`);set('downVolume',`${smallUnit(+r.down_volume)} 手`);
    set('flatVolumeLabel',`平盘成交量：${smallUnit(+r.flat_volume)} 手 · ${pct(vFlat)}`);
    set('totalAmount',`${smallUnit(+r.total_amount)} 元`);
    const aUp=pctOf(r.up_amount,r.total_amount),aDown=pctOf(r.down_amount,r.total_amount),aFlat=pctOf(r.flat_amount,r.total_amount);
    drawSegments($('amountBar'),aUp,aFlat,aDown);
    set('upAmountPct',pct(aUp));set('downAmountPct',pct(aDown));set('upAmount',`${smallUnit(+r.up_amount)} 元`);set('downAmount',`${smallUnit(+r.down_amount)} 元`);
    set('flatAmountLabel',`平盘成交额：${smallUnit(+r.flat_amount)} 元 · ${pct(aFlat)}`);
    const tv=trin(r,'volume'),ta=trin(r,'amount');
    set('trinVol',tv === null ? '—' : formatNum(tv,4));set('trinAmt',ta === null ? '—' : formatNum(ta,4));
    for (const [id,value] of [['trinVolPointer',tv],['trinAmtPointer',ta]]) {
      if (value!==null) $(id).style.left=`calc(${Math.max(2,Math.min(98,value/2*100))}% - 3px)`;
    }
    const banner=$('dataBanner');banner.classList.add('visible');
    if(r.is_sample){banner.classList.remove('live');banner.textContent='演示模式｜当前使用你截图里的 5,222 只股票统计，原图未注明日期。配置 Tushare 密钥并运行采集任务后，自动展示真实交易日数据。';}
    else {banner.classList.add('live');banner.textContent=`真实交易日数据｜${readableDate(r.trade_date)} 收盘行情。${state.updatedAt?' 最后发布：'+String(state.updatedAt).replace('T',' ').slice(0,19)+'（北京时间）':''} 非交易日保留上一交易日数据。`}
  }
  function emptyChart(){
    $('historyChart').innerHTML=`<div class="chart-empty"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 53V12M8 53h49M13 42l12-13 10 7 17-20"/><circle cx="13" cy="42" r="2"/><circle cx="25" cy="29" r="2"/><circle cx="35" cy="36" r="2"/><circle cx="52" cy="16" r="2"/></svg><strong>历史曲线即将形成</strong><small>当前没有已验证的历史交易日数据<br>首次运行「历史回填」后将显示真实趋势</small></div>`;
  }
  function renderChart(){
    const full=state.history;
    if (!full.length) {emptyChart();return;}
    const metric=chartMetrics[state.metric];const selected=state.period==='all'?full:full.slice(-Number(state.period));
    const rows=selected.map(r=>({r,v:metric.get(r)})).filter(x=>x.v!==null && Number.isFinite(x.v));
    if (!rows.length){emptyChart();return;}
    const W=1000,H=265,L=62,R=18,T=15,B=36;const pw=W-L-R,ph=H-T-B;
    let min=Math.min(...rows.map(x=>x.v)),max=Math.max(...rows.map(x=>x.v));
    if(min===max){min=Math.max(0,min*0.8-1);max=max*1.2+1;}
    else{const pad=(max-min)*.15;min=Math.max(0,min-pad);max+=pad;}
    if(state.metric==='down_ratio'){min=Math.max(0,Math.floor(min/10)*10);max=Math.min(100,Math.ceil(max/10)*10);if(max<=min){max=min+10;}}
    const xp=(i)=>L+(rows.length===1?pw/2:i*pw/(rows.length-1));
    const yp=(v)=>T+(max-v)/(max-min)*ph;
    const fmtY=(v)=>state.metric==='down_ratio'||state.metric==='adr' ? `${formatNum(v,0)}%` : formatNum(v,2);
    const coords=rows.map((x,i)=>[xp(i),yp(x.v)]);const pts=coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area=pts+` L${coords.at(-1)[0]},${T+ph} L${coords[0][0]},${T+ph} Z`;
    const lines=Array.from({length:5},(_,i)=>{let val=min+(max-min)*i/4,y=yp(val);return `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#2d3c54" stroke-dasharray="4 5"/><text x="${L-13}" y="${y+4}" text-anchor="end" fill="#71829f" font-size="12">${fmtY(val)}</text>`}).join('');
    const ticks=[0,Math.round((rows.length-1)/4),Math.round((rows.length-1)/2),Math.round((rows.length-1)*3/4),rows.length-1];
    const xlabels=[...new Set(ticks)].map(i=>`<text x="${xp(i)}" y="${H-9}" text-anchor="middle" fill="#71829f" font-size="12">${readableDate(rows[i].r.trade_date).slice(5)}</text>`).join('');
    const dots=rows.length<8?coords.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4" fill="${metric.color}" stroke="#142238" stroke-width="2"/>`).join(''):'';
    const last=coords.at(-1);
    $('historyChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${metric.label}按交易日变化的折线图"><defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${metric.color}" stop-opacity=".27"/><stop offset="100%" stop-color="${metric.color}" stop-opacity="0"/></linearGradient></defs>${lines}${xlabels}<path d="${area}" fill="url(#chartArea)"/><path d="${pts}" fill="none" stroke="${metric.color}" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${dots}<circle cx="${last[0]}" cy="${last[1]}" r="5" fill="${metric.color}" stroke="#dbe8ff" stroke-width="1.5"/><line id="hoverLine" x1="0" y1="${T}" x2="0" y2="${T+ph}" stroke="#91a9cb" stroke-dasharray="4 5" visibility="hidden"/><circle id="hoverDot" r="6" fill="#fff" stroke="${metric.color}" stroke-width="3" visibility="hidden"/></svg>`;
    const wrap=$('chartWrap'),svg=$('historyChart').querySelector('svg'),tip=$('chartTip');
    svg.onpointermove=(event)=>{
      const rect=svg.getBoundingClientRect();let pos=(event.clientX-rect.left)/rect.width*W;
      let i=rows.length===1?0:Math.round((pos-L)/pw*(rows.length-1));i=Math.max(0,Math.min(rows.length-1,i));
      const [x,y]=coords[i];const item=rows[i];
      svg.querySelector('#hoverLine').setAttribute('x1',x);svg.querySelector('#hoverLine').setAttribute('x2',x);svg.querySelector('#hoverLine').setAttribute('visibility','visible');
      svg.querySelector('#hoverDot').setAttribute('cx',x);svg.querySelector('#hoverDot').setAttribute('cy',y);svg.querySelector('#hoverDot').setAttribute('visibility','visible');
      tip.replaceChildren();tip.append(document.createTextNode(readableDate(item.r.trade_date)));
      const big=document.createElement('strong');big.textContent=`${metric.label}: ${formatNum(item.v,metric.unit ? 2 : 4)}${metric.unit}`;tip.append(big);
      tip.style.left=`${Math.min(rect.width-95,Math.max(95,x/W*rect.width))}px`;tip.style.top=`${Math.max(62,y/H*rect.height)}px`;tip.hidden=false;
    };
    svg.onpointerleave=()=>{tip.hidden=true;svg.querySelector('#hoverLine').setAttribute('visibility','hidden');svg.querySelector('#hoverDot').setAttribute('visibility','hidden')};
  }
  function renderTable(){
    const tbody=$('historyTable');tbody.replaceChildren();
    if (!state.history.length) {const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=9;td.textContent='暂无已验证的历史记录，请通过定时任务或手动执行采集来回填。';tr.append(td);tbody.append(tr);set('tableFooter','0 条已验证记录');return;}
    const recent=[...state.history].reverse().slice(0,60);
    for(const r of recent){
      const values=[readableDate(r.trade_date),formatNum(r.up),formatNum(r.down),formatNum(r.flat),pct(pctOf(r.up,r.total)),pct(pctOf(r.down,r.total)),`${formatNum(r.total_amount/1e8,2)} 亿`,trin(r,'volume')?.toFixed(4)||'—',trin(r,'amount')?.toFixed(4)||'—'];
      const tr=document.createElement('tr');for(let i=0;i<values.length;i++){const td=document.createElement('td');td.textContent=values[i];if(i===1||i===4)td.classList.add('pos');if(i===2||i===5)td.classList.add('neg');tr.append(td);}tbody.append(tr);
    }
    set('tableFooter',`展示最近 ${recent.length} 条，共保存 ${state.history.length} 个交易日`);
  }
  function exportCSV(){
    if(!state.history.length){alert('暂无真实历史记录可导出。');return;}
    const head=['交易日期','总家数','上涨家数','下跌家数','平盘家数','上涨占比%','下跌占比%','成交量(手)','成交额(元)','上涨成交量(手)','下跌成交量(手)','上涨成交额(元)','下跌成交额(元)','ADR%','TRIN量','TRIN额'];
    const rows=state.history.map(r=>[r.trade_date,r.total,r.up,r.down,r.flat,pctOf(r.up,r.total).toFixed(4),pctOf(r.down,r.total).toFixed(4),r.total_volume,r.total_amount,r.up_volume,r.down_volume,r.up_amount,r.down_amount,pctOf(r.up,r.down).toFixed(4),trin(r,'volume')?.toFixed(6)||'',trin(r,'amount')?.toFixed(6)||'']);
    const content='\ufeff'+[head,...rows].map(row=>row.join(',')).join('\r\n');const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`A股市场宽度_${state.history.at(-1).trade_date}.csv`;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},150);
  }
  async function load(){
    $('refreshButton').disabled=true;
    try {
      const [historyReq,sampleReq]=await Promise.allSettled([
        fetch(`./data/history.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('读取数据文件失败');return r.json()}),
        fetch('./data/sample.json').then(r=>{if(!r.ok)throw Error('读取示例失败');return r.json()})
      ]);
      const payload=historyReq.status==='fulfilled'?historyReq.value:null;
      state.history=Array.isArray(payload?.records)?payload.records.filter(validRow).sort((a,b)=>String(a.trade_date).localeCompare(String(b.trade_date))):[];
      state.updatedAt=payload?.updated_at??null;state.sample=!state.history.length;
      const demo=sampleReq.status==='fulfilled'&&validRow(sampleReq.value)?sampleReq.value:fallbackDemo;
      renderMain(state.history.at(-1)||demo);renderChart();renderTable();
    }catch(error){console.error(error);state.history=[];renderMain(fallbackDemo);emptyChart();renderTable();}
    finally{$('refreshButton').disabled=false;}
  }
  document.querySelectorAll('[data-period]').forEach(btn=>btn.addEventListener('click',()=>{
    state.period=btn.dataset.period;document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b===btn));renderChart();
  }));
  document.querySelectorAll('[data-metric]').forEach(btn=>btn.addEventListener('click',()=>{
    state.metric=btn.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.classList.toggle('active',b===btn));renderChart();
  }));
  $('refreshButton').addEventListener('click',load);$('exportButton').addEventListener('click',exportCSV);
  load();
})();