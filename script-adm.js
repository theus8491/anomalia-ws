const SUPABASE_URL = 'https://tfgjfscnuemunuwzvtjr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vCiz2wBxb7yRfrfhJxYOfg__u3kka3W';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const proscritos = ['Necromante', 'Cavaleiro da Morte', 'Bruxo', 'Encantador', 'Ceifador'];
let cache = [];
let pvpsExpandidos = {}; 
let chartClassesInstance = null;
let chartParticipacaoInstance = null;

const rawPtsStorage = JSON.parse(localStorage.getItem('guilda_anomalia_pts')) || {
    1: { slots: [null, null, null, null, null], modo: 'normal' },
    2: { slots: [null, null, null, null, null], modo: 'normal' }
};

let gruposPts = {};
Object.keys(rawPtsStorage).forEach(k => {
    let val = rawPtsStorage[k];
    gruposPts[k] = Array.isArray(val) 
        ? { slots: val, modo: 'normal' } 
        : { slots: val.slots || [null, null, null, null, null], modo: val.modo || (val.gvg ? 'gvg' : 'normal') };
});

const salvarPtsStorage = () => localStorage.setItem('guilda_anomalia_pts', JSON.stringify(gruposPts));

async function mudarAba(aba) {
    const isMembros = aba === 'membros';
    const isPts = aba === 'pts';
    const isStats = aba === 'stats';

    document.getElementById('btnTabMembros').className = isMembros ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    document.getElementById('btnTabPts').className = isPts ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    document.getElementById('btnTabStats').className = isStats ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";

    document.getElementById('tabMembros').classList.toggle('hidden', !isMembros);
    document.getElementById('tabPts').classList.toggle('hidden', !isPts);
    document.getElementById('tabStats').classList.toggle('hidden', !isStats);

    if (cache.length === 0) {
        await carregarMembros();
    } else {
        if (isPts) renderPts();
        if (isStats) renderStats();
    }
}

async function carregarMembros() {
    document.getElementById('statusMensagem').textContent = 'Buscando dados...';
    
    let allData = [];
    let page = 0;
    const pageSize = 50; // Busca em lotes seguros para evitar limites do servidor Supabase
    let fetching = true;

    while (fetching) {
        const { data, error } = await _supabase
            .from('guild_members')
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .order('created_at', { ascending: false });

        if (error) { 
            document.getElementById('statusMensagem').textContent = 'Erro: ' + error.message; 
            return; 
        }

        if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < pageSize) {
                fetching = false; // Encontrou o fim dos registros
            } else {
                page++;
            }
        } else {
            fetching = false;
        }
    }

    document.getElementById('statusMensagem').textContent = '';
    cache = allData;
    aplicarFiltros();
    if (!document.getElementById('tabPts').classList.contains('hidden')) renderPts();
    if (!document.getElementById('tabStats').classList.contains('hidden')) renderStats();
}

function renderStats() {
    if (!cache.length) return;

    const catacumbaCount = cache.filter(m => m.has_catacumba).length;
    const catacumbaNao = cache.length - catacumbaCount;
    const mermemCount = cache.filter(m => m.has_mermem).length;
    const mermemNao = cache.length - mermemCount;

    const elCat = document.getElementById('statCatacumba');
    const elMer = document.getElementById('statMermem');
    if (elCat) elCat.textContent = catacumbaCount;
    if (elMer) elMer.textContent = mermemCount;

    const counts = cache.reduce((acc, curr) => { 
        acc[curr.char_class || 'Outros'] = (acc[curr.char_class || 'Outros'] || 0) + 1; 
        return acc; 
    }, {});

    const labelsClasses = Object.keys(counts);
    const dataClasses = Object.values(counts);

    const coresClasses = [
        '#d97706', '#eab308', '#22c55e', '#3b82f6', '#ef4444', 
        '#f97316', '#a855f7', '#06b6d4', '#84cc16', '#ec4899', '#14b8a6', '#64748b'
    ];

    const ctxClasses = document.getElementById('chartClasses')?.getContext('2d');
    if (ctxClasses) {
        if (chartClassesInstance) chartClassesInstance.destroy();
        chartClassesInstance = new Chart(ctxClasses, {
            type: 'doughnut',
            data: {
                labels: labelsClasses,
                datasets: [{
                    data: dataClasses,
                    backgroundColor: coresClasses.slice(0, labelsClasses.length),
                    borderWidth: 2,
                    borderColor: '#1a1410',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#fde68a', font: { family: 'serif', size: 11 }, boxWidth: 14, padding: 12 }
                    }
                }
            }
        });
    }

    const ctxPart = document.getElementById('chartParticipacao')?.getContext('2d');
    if (ctxPart) {
        if (chartParticipacaoInstance) chartParticipacaoInstance.destroy();
        chartParticipacaoInstance = new Chart(ctxPart, {
            type: 'bar',
            data: {
                labels: ['Catacumba', 'Mermem'],
                datasets: [
                    { label: 'Sim', data: [catacumbaCount, mermemCount], backgroundColor: '#10b981', borderRadius: 6 },
                    { label: 'Não', data: [catacumbaNao, mermemNao], backgroundColor: '#ef4444', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#fde68a', font: { family: 'serif', size: 11 } } }
                },
                scales: {
                    x: { ticks: { color: '#fde68a', font: { family: 'serif', size: 12 } }, grid: { color: '#291c13' } },
                    y: { ticks: { color: '#fde68a', precision: 0 }, grid: { color: '#291c13' } }
                }
            }
        });
    }
}

function aplicarFiltros() {
    const filtroEl = document.getElementById('filtroClasse');
    const buscaEl = document.getElementById('buscaNome');
    const filtro = filtroEl ? filtroEl.value : 'todos';
    const busca = buscaEl ? buscaEl.value.toLowerCase().trim() : '';

    renderResumoClasses(cache);
    render(cache.filter(m => (filtro === 'todos' || m.char_class === filtro) && (!busca || (m.char_name || '').toLowerCase().includes(busca))));
}

const filtrarPorClasse = (classe) => { 
    const filtroEl = document.getElementById('filtroClasse');
    if (!filtroEl) return;
    filtroEl.value = (filtroEl.value === classe) ? 'todos' : classe;
    aplicarFiltros(); 
};

function renderResumoClasses(dados) {
    const container = document.getElementById('adminClassSummary');
    if (!container) return;
    if (!dados.length) { container.innerHTML = '<span class="text-amber-500/60 text-xs col-span-full">Nenhum herói cadastrado.</span>'; return; }
    const counts = dados.reduce((acc, curr) => { acc[curr.char_class || 'Outros'] = (acc[curr.char_class || 'Outros'] || 0) + 1; return acc; }, {});
    const filtroEl = document.getElementById('filtroClasse');
    const filtroAtual = filtroEl ? filtroEl.value : 'todos';

    container.innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cls, total]) => {
        const isSel = filtroAtual === cls;
        return `<div onclick="filtrarPorClasse('${cls}')" class="bg-[#130f0d] border ${isSel ? 'border-amber-500 bg-[#241710] ring-1 ring-amber-500/50' : 'border-[#352214] hover:border-amber-600/60'} rounded-xl px-3 py-2 flex justify-between items-center shadow-md cursor-pointer transition"><span class="font-bold text-amber-300 text-xs">${cls}</span><span class="bg-[#291c13] px-2 py-0.5 rounded-lg text-xs font-semibold text-amber-200 border border-[#63452c]">${total}</span></div>`;
    }).join('');
}

function formatItem(itemObj) {
    if (!itemObj || (typeof itemObj === 'string' && ['não tenho', 'nao tenho', '-', '', 'não', 'nao', '+0 (sem amp)'].includes(itemObj.toLowerCase())) || itemObj.nao_tem) 
        return '<span class="text-red-400">Não tenho</span>';
    if (typeof itemObj === 'string') return `<span class="text-amber-200 font-bold">${itemObj}</span>`;
    let res = [];
    if (itemObj.amplificacao && itemObj.amplificacao !== '+0 (Sem amp)') res.push(`<span class="text-purple-300 font-bold">${itemObj.amplificacao}</span>`);
    if (itemObj.tipo && itemObj.tipo !== '-') res.push(`<span class="text-amber-200">(${itemObj.tipo})</span>`);
    if (itemObj.nivel && itemObj.nivel !== '-') res.push(`<span class="text-emerald-400">Nvl ${itemObj.nivel}</span>`);
    return res.length ? res.join(' ') : '<span class="text-emerald-400 font-bold">Equipado</span>';
}

const badgeItem = (nome, obj, isPvp) => {
    const naoTem = !obj || obj.nao_tem || (typeof obj === 'string' && ['não tenho', 'nao tenho', '-', ''].includes(obj.toLowerCase()));
    return `<div class="flex items-center justify-between bg-[#130f0d] border ${naoTem ? 'bg-red-950/20 border-red-900/30' : (isPvp ? 'bg-purple-950/30 border-purple-900/40' : 'bg-emerald-950/30 border-emerald-900/40')} px-2 py-1 rounded text-[11px]"><span class="text-amber-500/80 font-medium">${nome}:</span><span>${formatItem(obj)}</span></div>`;
};

function render(membros) {
    const grid = document.getElementById('gridMembros');
    grid.innerHTML = '';
    document.getElementById('totalMembros').textContent = cache.length;
    let clas = 0, pros = 0;
    cache.forEach(m => proscritos.includes(m.char_class) ? pros++ : clas++);
    document.getElementById('totalClas').textContent = clas;
    document.getElementById('totalProscritos').textContent = pros;

    if (!membros.length) { grid.innerHTML = `<div class="text-center py-10 text-amber-600 italic col-span-full">Nenhum herói encontrado.</div>`; return; }

    membros.forEach(m => {
        const card = document.createElement('div');
        card.className = 'bg-[#130f0d] border border-[#352214] rounded-xl p-3.5 space-y-3 shadow-md hover:border-[#63452c] transition';
        card.innerHTML = `
            <div class="flex items-center justify-between border-b border-[#291c13] pb-2.5">
                <div>
                    <h3 class="text-base font-black text-amber-100 font-rpg">${m.char_name || '-'}</h3>
                    <div class="text-xs text-amber-400 font-semibold">${m.char_class || '-'} • Nível ${m.char_level || '-'}</div>
                </div>
                <button onclick="del('${m.id}')" class="bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-300 px-2 py-1 rounded-lg text-xs transition cursor-pointer" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center bg-[#1a1410] p-2 rounded-lg border border-[#291c13] text-[11px]">
                <div><span class="text-amber-600 block text-[9px] uppercase font-bold">Tal 35k</span><span class="text-amber-200 font-bold">${m.talentos_35k || '-'}</span></div>
                <div><span class="text-amber-600 block text-[9px] uppercase font-bold">Ramo</span><span class="text-amber-200 font-bold">${m.almahad_branch || '-'}</span></div>
                <div><span class="text-amber-600 block text-[9px] uppercase font-bold">T5</span><span class="text-amber-200 font-bold">${m.almahad_t5 || '-'}</span></div>
                <div><span class="text-amber-600 block text-[9px] uppercase font-bold">Full</span><span class="text-amber-200 font-bold">${m.full_branches || '-'}</span></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-purple-950/10 border border-purple-900/40 rounded-xl p-2.5 space-y-1.5">
                    <div class="text-xs font-bold text-purple-300 font-rpg border-b border-purple-900/40 pb-1"><i class="fa-solid fa-shield-halved"></i> Set PvP</div>
                    <div class="space-y-1">
                        ${['Elmo', 'Peito', 'Luva', 'Bota'].map((k, i) => badgeItem(k, [m.set_helmet_pvp, m.set_chest_pvp, m.set_gloves_pvp, m.set_boots_pvp][i], true)).join('')}
                        ${['Brac 1', 'Brac 2', 'Anel 1', 'Anel 2'].map((k, i) => badgeItem(k, [m.acc_bracelete1_pvp, m.acc_bracelete2_pvp, m.acc_anel1_pvp, m.acc_anel2_pvp][i], true)).join('')}
                        ${badgeItem('Amuleto', m.acc_amuleto_pvp, true)} ${badgeItem('Capa', m.acc_capa_pvp, true)} ${badgeItem('Arma 1', m.weapon_pvp1, true)} ${badgeItem('Arma 2', m.weapon_pvp2, true)} ${badgeItem('Escudo', m.shield_pvp, true)}
                    </div>
                </div>
                <div class="bg-emerald-950/10 border border-emerald-900/40 rounded-xl p-2.5 space-y-1.5">
                    <div class="text-xs font-bold text-emerald-300 font-rpg border-b border-emerald-900/40 pb-1"><i class="fa-solid fa-staff-snake"></i> Set PvE</div>
                    <div class="space-y-1">
                        ${['Elmo', 'Peito', 'Luva', 'Bota'].map((k, i) => badgeItem(k, [m.set_helmet_pve, m.set_chest_pve, m.set_gloves_pve, m.set_boots_pve][i], false)).join('')}
                        ${['Brac 1', 'Brac 2', 'Anel 1', 'Anel 2'].map((k, i) => badgeItem(k, [m.acc_bracelete1_pve, m.acc_bracelete2_pve, m.acc_anel1_pve, m.acc_anel2_pve][i], false)).join('')}
                        ${badgeItem('Amuleto', m.acc_amuleto_pve, false)} ${badgeItem('Capa', m.acc_capa_pve, false)} ${badgeItem('T5', m.weapon_t5, false)} ${badgeItem('PvE', m.weapon_pve, false)} ${badgeItem('Map5', m.weapon_map5, false)} ${badgeItem('Escudo', m.shield_pve, false)}
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-[#291c13] text-[11px] text-amber-400">
                <div class="flex items-center gap-3"><span>Catacumba: ${m.has_catacumba ? (m.catacumba_type || 'Sim') : 'Não'}</span><span>Mermem: ${m.has_mermem ? (m.mermem_type || 'Sim') : 'Não'}</span></div>
                <span class="text-amber-700">${m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

function adicionarPt() {
    const num = Math.max(0, ...Object.keys(gruposPts).map(Number)) + 1;
    gruposPts[num] = { slots: [null, null, null, null, null], modo: 'normal' };
    salvarPtsStorage();
    renderPts();
}

const removerPt = (ptId) => { delete gruposPts[ptId]; salvarPtsStorage(); renderPts(); };
const mudarModoPt = (ptId, modo) => { if (gruposPts[ptId]) { gruposPts[ptId].modo = modo; salvarPtsStorage(); renderPts(); } };

function escalarMembro(ptId, slotIndex, membroId) {
    if (!gruposPts[ptId]) gruposPts[ptId] = { slots: [null, null, null, null, null], modo: 'normal' };
    gruposPts[ptId].slots[slotIndex] = membroId ? (cache.find(m => String(m.id) === String(membroId)) || null) : null;
    salvarPtsStorage();
    renderPts();
}

const togglePvPPrevia = (ptId, membroId) => { pvpsExpandidos[`${ptId}-${membroId}`] = !pvpsExpandidos[`${ptId}-${membroId}`]; renderPts(); };

function renderPts() {
    const container = document.getElementById('gridPts');
    container.innerHTML = '';
    const idsPt = Object.keys(gruposPts);
    if (!idsPt.length) { container.innerHTML = '<div class="text-center py-10 text-amber-600 italic col-span-full">Nenhuma PT criada. Clique em "Nova PT".</div>'; return; }

    const nomesModos = { normal: 'Padrão', gvg: 'GvG (PvP)', pve: 'PvE Geral', map5: 'Raide Mapa 5', t5: 'Raide T5' };
    const idsGlobalmenteSelecionados = Object.values(gruposPts).flatMap(pt => pt?.slots?.map(m => m?.id ? String(m.id) : null) || []).filter(Boolean);

    idsPt.forEach((ptId, index) => {
        const ptData = gruposPts[ptId] || { slots: [null, null, null, null, null], modo: 'normal' };
        const slots = ptData.slots || [null, null, null, null, null];
        const modo = ptData.modo || 'normal';
        const isAutoExpand = modo !== 'normal';

        const ptCard = document.createElement('div');
        ptCard.className = `bg-[#130f0d] border ${isAutoExpand ? 'border-amber-500/80 shadow-amber-950/50 ring-1 ring-amber-500/40' : 'border-[#352214]'} rounded-xl p-3.5 space-y-3 shadow-md transition`;

        let slotsHtml = slots.map((membroAtual, slotIdx) => {
            const idsIndisponiveis = idsGlobalmenteSelecionados.filter(id => !membroAtual || String(id) !== String(membroAtual.id));
            return `
                <div class="flex items-center justify-between bg-[#1a1410] border border-[#352214] px-2.5 py-1.5 rounded-lg text-xs">
                    <span class="text-amber-500 font-bold w-6">#${slotIdx + 1}</span>
                    <select onchange="escalarMembro('${ptId}', ${slotIdx}, this.value)" class="bg-[#130f0d] border border-[#422b17] rounded px-2 py-1 text-amber-200 w-full focus:outline-none">
                        <option value="">(Vazio - Selecionar Membro)</option>
                        ${cache.map(m => {
                            if (idsIndisponiveis.includes(String(m.id))) return ''; 
                            const isSelected = membroAtual && String(membroAtual.id) === String(m.id);
                            return `<option value="${m.id}" ${isSelected ? 'selected' : ''}>${m.char_name} (${m.char_class} - Nvl ${m.char_level || '?'})</option>`;
                        }).join('')}
                    </select>
                </div>
            `;
        }).join('');

        const membrosAtivos = slots.filter(Boolean);
        let previaHtml = membrosAtivos.length === 0 ? '<div class="text-amber-700/60 italic text-[11px] text-center py-1">Nenhum membro escalado nesta PT.</div>' : membrosAtivos.map(m => {
            const originalSlotIndex = slots.findIndex(item => item && String(item.id) === String(m.id));
            const isExp = pvpsExpandidos[`${ptId}-${m.id}`] || isAutoExpand;

            const mapItens = {
                gvg: [['Elmo', m.set_helmet_pvp], ['Peito', m.set_chest_pvp], ['Luva', m.set_gloves_pvp], ['Bota', m.set_boots_pvp], ['Brac 1', m.acc_bracelete1_pvp], ['Brac 2', m.acc_bracelete2_pvp], ['Anel 1', m.acc_anel1_pvp], ['Anel 2', m.acc_anel2_pvp], ['Amuleto', m.acc_amuleto_pvp], ['Capa', m.acc_capa_pvp], ['Arma 1', m.weapon_pvp1], ['Arma 2', m.weapon_pvp2], ['Escudo', m.shield_pvp]],
                pve: [['Elmo', m.set_helmet_pve], ['Peito', m.set_chest_pve], ['Luva', m.set_gloves_pve], ['Bota', m.set_boots_pve], ['Brac 1', m.acc_bracelete1_pve], ['Brac 2', m.acc_bracelete2_pve], ['Anel 1', m.acc_anel1_pve], ['Anel 2', m.acc_anel2_pve], ['Amuleto', m.acc_amuleto_pve], ['Capa', m.acc_capa_pve], ['Arma PvE', m.weapon_pve], ['Escudo', m.shield_pve]],
                map5: [['Elmo', m.set_helmet_pve], ['Peito', m.set_chest_pve], ['Luva', m.set_gloves_pve], ['Bota', m.set_boots_pve], ['Brac 1', m.acc_bracelete1_pve], ['Brac 2', m.acc_bracelete2_pve], ['Anel 1', m.acc_anel1_pve], ['Anel 2', m.acc_anel2_pve], ['Amuleto', m.acc_amuleto_pve], ['Capa', m.acc_capa_pve], ['Arma Map 5', m.weapon_map5], ['Escudo', m.shield_pve]],
                t5: [['Elmo', m.set_helmet_pve], ['Peito', m.set_chest_pve], ['Luva', m.set_gloves_pve], ['Bota', m.set_boots_pve], ['Brac 1', m.acc_bracelete1_pve], ['Brac 2', m.acc_bracelete2_pve], ['Anel 1', m.acc_anel1_pve], ['Anel 2', m.acc_anel2_pve], ['Amuleto', m.acc_amuleto_pve], ['Capa', m.acc_capa_pve], ['Arma T5', m.weapon_t5], ['Escudo', m.shield_pve]]
            };
            const itensDet = mapItens[modo] || [];
            const corTema = modo === 'gvg' ? 'purple' : 'emerald';
            
            const formatItemPrevia = (nome, obj) => {
                const naoTem = !obj || obj.nao_tem || (typeof obj === 'string' && ['não tenho', 'nao tenho', '-', ''].includes(obj.toLowerCase()));
                return `<div class="flex justify-between bg-[#130f0d] px-2 py-1 rounded text-[10px] border ${naoTem ? 'border-red-950/20 text-red-400' : 'border-purple-900/30 text-amber-200'}"><span class="text-amber-500/80">${nome}:</span> <span>${formatItem(obj)}</span></div>`;
            };

            let detalhesHtml = isExp && modo !== 'normal' ? `
                <div class="mt-2 pt-2 border-t border-${corTema}-900/40 grid grid-cols-1 gap-1.5 bg-${corTema}-950/20 p-2 rounded-lg text-[10px]">
                    <div class="text-${corTema}-300 font-bold font-rpg mb-0.5"><i class="fa-solid fa-shield-halved"></i> Set ${nomesModos[modo]} (${m.char_name}):</div>
                    ${itensDet.map(([nome, obj]) => formatItemPrevia(nome, obj)).join('')}
                </div>
            ` : '';

            return `
                <div class="bg-[#130f0d] border border-[#291c13] p-2 rounded text-[11px] space-y-1.5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5 truncate">
                            <span class="text-amber-600 font-bold">#${originalSlotIndex + 1}</span>
                            <span class="text-amber-200 font-bold truncate">${m.char_name}</span>
                            <span class="text-amber-500 text-[10px]">(${m.char_class})</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-amber-400 text-[10px]">Nvl ${m.char_level || '?'}</span>
                            ${modo !== 'normal' ? `<button onclick="togglePvPPrevia('${ptId}', '${m.id}')" class="text-amber-300 hover:text-amber-100 bg-[#241710] border border-[#63452c] px-2 py-0.5 rounded text-[10px] transition cursor-pointer"><i class="fa-solid ${isExp ? 'fa-eye-slash' : 'fa-eye'}"></i></button>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-3 text-[10px] text-amber-500/80 pt-1 border-t border-[#221711]">
                        <span>Catacumba: <span class="${m.has_catacumba ? 'text-emerald-400 font-bold' : 'text-red-400'}">${m.has_catacumba ? (m.catacumba_type || 'Sim') : 'Não'}</span></span>
                        <span>•</span>
                        <span>Mermem: <span class="${m.has_mermem ? 'text-emerald-400 font-bold' : 'text-red-400'}">${m.has_mermem ? (m.mermem_type || 'Sim') : 'Não'}</span></span>
                    </div>
                    ${detalhesHtml}
                </div>
            `;
        }).join('');

        ptCard.innerHTML = `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#291c13] pb-2 gap-2">
                <h3 class="text-sm font-black text-amber-200 font-rpg"><i class="fa-solid fa-shield-cat text-amber-600"></i> PT ${index + 1}</h3>
                <div class="flex items-center gap-2 w-full sm:w-auto justify-between">
                    <select onchange="mudarModoPt('${ptId}', this.value)" class="bg-[#1a1410] border border-[#63452c] text-amber-300 rounded px-2 py-1 text-[11px] font-rpg font-bold focus:outline-none cursor-pointer">
                        ${Object.entries(nomesModos).map(([k, v]) => `<option value="${k}" ${modo === k ? 'selected' : ''}>Modo: ${v}</option>`).join('')}
                    </select>
                    <button onclick="removerPt('${ptId}')" class="text-red-400 hover:text-red-300 text-xs transition cursor-pointer" title="Excluir PT"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <div class="space-y-2">${slotsHtml}</div>
            <div class="mt-3 bg-[#1a1410] border border-[#352214] rounded-lg p-2.5 space-y-1.5">
                <div class="text-[11px] font-bold text-amber-400 font-rpg uppercase tracking-wider border-b border-[#291c13] pb-1 flex items-center justify-between">
                    <span><i class="fa-solid fa-eye mr-1 text-amber-600"></i> Prévia (${nomesModos[modo]})</span>
                    <span class="text-amber-600 font-normal">${membrosAtivos.length}/5 membros</span>
                </div>
                <div class="space-y-1">${previaHtml}</div>
            </div>
        `;
        container.appendChild(ptCard);
    });
}

async function del(id) {
    if (!confirm('Tem certeza que deseja excluir este herói do banco de dados?')) return;
    const { error } = await _supabase.from('guild_members').delete().eq('id', id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    carregarMembros();
}

function copiarDiscord() {
    let texto = "⚔️ **ESCALAÇÃO DE PTs - GUILDA ANOMALIA** ⚔️\n\n";
    const nomesModos = { normal: 'Padrão', gvg: 'GvG (PvP)', pve: 'PvE Geral', map5: 'Raide Mapa 5', t5: 'Raide T5' };
    Object.keys(gruposPts).forEach((ptId, index) => {
        const ptData = gruposPts[ptId] || {};
        texto += `🔹 **PT ${index + 1}** [Modo: ${nomesModos[ptData.modo || 'normal']}]\n`;
        (ptData.slots || []).forEach((m, sIdx) => {
            texto += m && m.char_name 
                ? `> ${sIdx + 1}. ${m.char_name} (${m.char_class} - Nvl ${m.char_level || '?'}) | Catac: ${m.has_catacumba ? (m.catacumba_type || 'Sim') : 'Não'} | Merm: ${m.has_mermem ? (m.mermem_type || 'Sim') : 'Não'}\n`
                : `> ${sIdx + 1}. [Vazio]\n`;
        });
        texto += `\n`;
    });
    navigator.clipboard.writeText(texto).then(() => alert('Escalação copiada para a área de transferência!'));
}

function gerarPDFPts() {
    const idsPt = Object.keys(gruposPts);
    if (!idsPt.length) { alert('Não há PTs formadas para gerar o PDF.'); return; }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(99, 69, 44);
    doc.text("Planilha de Escalação de PTs - Guilda Anomalia", 10, 10);
    doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Total de PTs: ${idsPt.length}`, 10, 15);

    const nomesModos = { normal: 'Padrão', gvg: 'GvG (PvP)', pve: 'PvE Geral', map5: 'Raide Mapa 5', t5: 'Raide T5' };
    let startX = 10, startY = 20;
    const colWidth = 72, colGap = 5, maxCols = 4, pageHeight = 200;

    idsPt.forEach((ptId, index) => {
        const ptData = gruposPts[ptId] || { slots: [], modo: 'normal' };
        const slots = ptData.slots || [null, null, null, null, null];
        const modoLabel = nomesModos[ptData.modo || 'normal'];

        const tableBody = slots.map((m, i) => [
            `#${i+1}`, 
            m && m.char_name ? `${m.char_name} (${m.char_class || '?'})` : '[ Vazio ]', 
            m && m.char_name ? `Cat: ${m.has_catacumba ? (m.catacumba_type || 'Sim') : 'Não'} | Merm: ${m.has_mermem ? (m.mermem_type || 'Sim') : 'Não'}` : '-'
        ]);

        if (startY + 45 > pageHeight) { doc.addPage(); startY = 15; }

        doc.autoTable({
            startY: startY,
            head: [[{ content: `PT - ${index + 1} (${modoLabel})`, colSpan: 3, styles: { halign: 'center', fillColor: [41, 28, 19], textColor: [212, 175, 55], fontSize: 8 } }]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [41, 28, 19], textColor: [212, 175, 55], fontStyle: 'bold', cellPadding: 1.5 },
            bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
            columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 36, halign: 'left' }, 2: { cellWidth: 28, halign: 'center' } },
            margin: { left: startX, right: 297 - (startX + colWidth) }
        });

        startX += colWidth + colGap;
        if ((index + 1) % maxCols === 0) { startX = 10; startY = doc.lastAutoTable.finalY + 6; }
    });

    const pages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`Página ${i} de ${pages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 4, { align: 'center' });
    }
    doc.save("escalacao-pts-guilda-anomalia.pdf");
}

const extrairTextoPdf = (obj) => (!obj || obj.nao_tem || (typeof obj === 'string' && ['não tenho', 'nao tenho', '-', ''].includes(obj.toLowerCase()))) ? 'Não' : (typeof obj === 'string' ? obj : [obj.amplificacao, obj.tipo, obj.nivel ? 'Nvl ' + obj.nivel : ''].filter(x => x && x !== '+0 (Sem amp)' && x !== '-').join(' ') || 'Sim');

function gerarPDF() {
    if (!cache.length) { alert('Não há dados.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(99, 69, 44);
    doc.text("Relatório Completo - Guilda Anomalia", 10, 10);
    doc.setFontSize(7.5); doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Total: ${cache.length}`, 10, 15);

    const rows = cache.map(m => [
        m.char_name || '-', m.char_class || '-', m.char_level || '-', m.talentos_35k || '-', m.almahad_branch || '-', m.almahad_t5 || '-', m.full_branches || '-',
        extrairTextoPdf(m.set_helmet_pvp), extrairTextoPdf(m.set_chest_pvp), extrairTextoPdf(m.set_gloves_pvp), extrairTextoPdf(m.set_boots_pvp), extrairTextoPdf(m.acc_bracelete1_pvp), extrairTextoPdf(m.acc_bracelete2_pvp), extrairTextoPdf(m.acc_anel1_pvp), extrairTextoPdf(m.acc_anel2_pvp), extrairTextoPdf(m.acc_amuleto_pvp), extrairTextoPdf(m.acc_capa_pvp), extrairTextoPdf(m.weapon_pvp1), extrairTextoPdf(m.weapon_pvp2), extrairTextoPdf(m.shield_pvp),
        extrairTextoPdf(m.set_helmet_pve), extrairTextoPdf(m.set_chest_pve), extrairTextoPdf(m.set_gloves_pve), extrairTextoPdf(m.set_boots_pve), extrairTextoPdf(m.acc_bracelete1_pve), extrairTextoPdf(m.acc_bracelete2_pve), extrairTextoPdf(m.acc_anel1_pve), extrairTextoPdf(m.acc_anel2_pve), extrairTextoPdf(m.acc_amuleto_pve), extrairTextoPdf(m.acc_capa_pve), extrairTextoPdf(m.weapon_t5), extrairTextoPdf(m.weapon_pve), extrairTextoPdf(m.weapon_map5), extrairTextoPdf(m.shield_pve),
        m.has_catacumba ? (m.catacumba_type || 'Sim') : 'Não', m.has_mermem ? (m.mermem_type || 'Sim') : 'Não', m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '-'
    ]);

    doc.autoTable({
        startY: 18,
        head: [['Herói', 'Classe', 'Nvl', 'Tal', 'Ramo', 'T5', 'Full', 'Elmo P', 'Peito P', 'Luva P', 'Bota P', 'Br1 P', 'Br2 P', 'An1 P', 'An2 P', 'Amu P', 'Capa P', 'Arm1 P', 'Arm2 P', 'Esc P', 'Elmo E', 'Peito E', 'Luva E', 'Bota E', 'Br1 E', 'Br2 E', 'An1 E', 'An2 E', 'Amu E', 'Capa E', 'T5 E', 'PvE E', 'Map5', 'Esc E', 'Catac', 'Merm', 'Data']],
        body: rows,
        headStyles: { fillColor: [41, 28, 19], textColor: [212, 175, 55], fontStyle: 'bold', halign: 'center', fontSize: 4.5, cellPadding: 1 },
        bodyStyles: { textColor: [40, 40, 40], fontSize: 4.5, halign: 'center', cellPadding: 1 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' }, 1: { halign: 'left' } },
        alternateRowStyles: { fillColor: [248, 245, 240] },
        margin: { horizontal: 3 }
    });

    const pages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`Página ${i} de ${pages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 4, { align: 'center' });
    }
    doc.save("relatorio-guilda-anomalia.pdf");
}

function gerarPDFEstatisticas() {
    if (!cache.length) { alert('Não há dados para gerar o PDF de estatísticas.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Cabeçalho
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(16); 
    doc.setTextColor(99, 69, 44);
    doc.text("Relatório Estatístico - Guilda Anomalia", 14, 15);

    doc.setFontSize(9); 
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} | Total de Membros: ${cache.length}`, 14, 21);

    // Contagem por Classe (Texto organizado em colunas)
    doc.setFontSize(11);
    doc.setTextColor(99, 69, 44);
    doc.text("Contagem por Classe:", 14, 29);

    const counts = cache.reduce((acc, curr) => { 
        acc[curr.char_class || 'Outros'] = (acc[curr.char_class || 'Outros'] || 0) + 1; 
        return acc; 
    }, {});

    const sortedClasses = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    let startX = 14;
    let startY = 35;
    let colWidth = 65;
    let maxRowsPerCol = 4;
    
    sortedClasses.forEach(([cls, total], index) => {
        let colIndex = Math.floor(index / maxRowsPerCol);
        let rowIndex = index % maxRowsPerCol;
        let x = startX + (colIndex * colWidth);
        let y = startY + (rowIndex * 5.5);
        doc.text(`• ${cls}: ${total} herói(is)`, x, y);
    });

    let nextY = startY + (Math.min(maxRowsPerCol, sortedClasses.length) * 5.5) + 4;

    // --- CONTABILIZAÇÃO DE CATACUMBA E MERMEM ---
    const catacumbaCount = cache.filter(m => m.has_catacumba).length;
    const catacumbaNao = cache.length - catacumbaCount;
    const mermemCount = cache.filter(m => m.has_mermem).length;
    const mermemNao = cache.length - mermemCount;

    doc.setFontSize(11);
    doc.setTextColor(99, 69, 44);
    doc.text("Participação em Eventos:", 14, nextY);

    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(`• Catacumba: ${catacumbaCount} Sim / ${catacumbaNao} Não`, 14, nextY + 6);
    doc.text(`• Mermem: ${mermemCount} Sim / ${mermemNao} Não`, 80, nextY + 6);

    nextY += 14;

    // Títulos dos Gráficos
    doc.setFontSize(11);
    doc.setTextColor(99, 69, 44);
    doc.text("Distribuição de Classes", 14, nextY);
    doc.text("Status de Catacumba e Mermem", 110, nextY);

    // Inserir os gráficos capturados do Chart.js (Rosca e Barras)
    const canvasClasses = document.getElementById('chartClasses');
    const canvasPart = document.getElementById('chartParticipacao');

    if (canvasClasses && canvasPart) {
        const imgClasses = canvasClasses.toDataURL('image/png', 1.0);
        const imgPart = canvasPart.toDataURL('image/png', 1.0);

        doc.addImage(imgClasses, 'PNG', 14, nextY + 3, 88, 65);
        doc.addImage(imgPart, 'PNG', 110, nextY + 3, 88, 65);
    }

    // --- LISTAGEM COMPLETA DE TODOS OS MEMBROS NO PDF DE ESTATÍSTICAS ---
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(99, 69, 44);
    doc.text("Relação Completa de Membros (Estatísticas)", 14, 15);

    const membrosRows = cache.map((m, idx) => [
        idx + 1,
        m.char_name || '-',
        m.char_class || '-',
        m.char_level || '-',
        m.has_catacumba ? (m.catacumba_type || 'Sim') : 'Não',
        m.has_mermem ? (m.mermem_type || 'Sim') : 'Não'
    ]);

    doc.autoTable({
        startY: 20,
        head: [['#', 'Herói', 'Classe', 'Nível', 'Catacumba', 'Mermem']],
        body: membrosRows,
        headStyles: { fillColor: [41, 28, 19], textColor: [212, 175, 55], fontStyle: 'bold', halign: 'center', fontSize: 8 },
        bodyStyles: { textColor: [40, 40, 40], fontSize: 8, halign: 'center' },
        columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { halign: 'left', fontStyle: 'bold' }, 2: { halign: 'left' } },
        alternateRowStyles: { fillColor: [248, 245, 240] },
        margin: { horizontal: 14 }
    });

    // Rodapé de páginas
    const pages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pages; i++) {
        doc.setPage(i); 
        doc.setFontSize(7.5); 
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
    }

    doc.save("estatisticas-guilda-anomalia.pdf");
}

_supabase.channel('realtime-guild-members-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'guild_members' }, () => carregarMembros()).subscribe();
carregarMembros();

// --- SISTEMA DE CONTROLE DE PRESENÇA ---

function obterSemanaAno() {
    const agora = new Date();
    const inicioAno = new Date(agora.getFullYear(), 0, 1);
    const dias = Math.floor((agora - inicioAno) / (24 * 60 * 60 * 1000));
    return Math.ceil((dias + inicioAno.getDay() + 1) / 7);
}

function obterDadosPresencaStorage() {
    let dadosSalvos = JSON.parse(localStorage.getItem('guilda_anomalia_presenca')) || {};
    const semanaAtual = obterSemanaAno();

    if (dadosSalvos.semana !== semanaAtual) {
        dadosSalvos = { semana: semanaAtual, registros: {} };
        localStorage.setItem('guilda_anomalia_presenca', JSON.stringify(dadosSalvos));
    }
    return dadosSalvos;
}

function salvarDadosPresencaStorage(dados) {
    localStorage.setItem('guilda_anomalia_presenca', JSON.stringify(dados));
}

// Substitua ou atualize sua função mudarAba existente com esta versão:
async function mudarAba(aba) {
    const isMembros = aba === 'membros';
    const isPts = aba === 'pts';
    const isStats = aba === 'stats';
    const isPresenca = aba === 'presenca';

    document.getElementById('btnTabMembros').className = isMembros ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    document.getElementById('btnTabPts').className = isPts ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    document.getElementById('btnTabStats').className = isStats ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    
    const btnPresenca = document.getElementById('btnTabPresenca');
    if (btnPresenca) {
        btnPresenca.className = isPresenca ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    }

    document.getElementById('tabMembros').classList.toggle('hidden', !isMembros);
    document.getElementById('tabPts').classList.toggle('hidden', !isPts);
    document.getElementById('tabStats').classList.toggle('hidden', !isStats);
    
    const tabPresenca = document.getElementById('tabPresenca');
    if (tabPresenca) tabPresenca.classList.toggle('hidden', !isPresenca);

    if (cache.length === 0) {
        await carregarMembros();
    } else {
        if (isPts && typeof renderPts === 'function') renderPts();
        if (isStats && typeof renderStats === 'function') renderStats();
        if (isPresenca) renderPresenca();
    }
}

function alternarSlotPresenca(membroId, slotIndex) {
    let dadosPresenca = obterDadosPresencaStorage();
    if (!dadosPresenca.registros[membroId]) {
        dadosPresenca.registros[membroId] = [null, null, null, null, null, null, null];
    }

    const atual = dadosPresenca.registros[membroId][slotIndex];
    let proximo = null;

    if (atual === null) proximo = 'ok';
    else if (atual === 'ok') proximo = 'falta';
    else if (atual === 'falta') proximo = 'justificou';
    else if (atual === 'justificou') proximo = null;

    dadosPresenca.registros[membroId][slotIndex] = proximo;
    salvarDadosPresencaStorage(dadosPresenca);
    renderPresenca();
}

function resetarPresenca() {
    if (!confirm('Deseja realmente limpar todos os registros de presença desta semana?')) return;
    let dadosPresenca = obterDadosPresencaStorage();
    dadosPresenca.registros = {};
    salvarDadosPresencaStorage(dadosPresenca);
    renderPresenca();
}

function renderPresenca() {
    const tbody = document.getElementById('tabelaPresencaCorpo');
    if (!tbody) return;

    if (!cache.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-amber-600 italic">Nenhum herói encontrado.</td></tr>`;
        return;
    }

    let dadosPresenca = obterDadosPresencaStorage();

    tbody.innerHTML = cache.map(m => {
        const slots = dadosPresenca.registros[m.id] || [null, null, null, null, null, null, null];
        
        let countOk = slots.filter(s => s === 'ok').length;
        let countFalta = slots.filter(s => s === 'falta').length;
        let countJust = slots.filter(s => s === 'justificou').length;

        let slotsHtml = slots.map((estado, idx) => {
            let bgClass = "bg-[#130f0d] border-[#352214] text-transparent hover:border-amber-500";
            let texto = "";

            if (estado === 'ok') {
                bgClass = "bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold";
                texto = "✔";
            } else if (estado === 'falta') {
                bgClass = "bg-red-950/80 border-red-600 text-red-300 font-bold";
                texto = "X";
            } else if (estado === 'justificou') {
                bgClass = "bg-amber-950/80 border-amber-600 text-amber-300 font-bold text-[10px]";
                texto = "Just";
            }

            return `
                <td class="p-1.5 text-center">
                    <button onclick="alternarSlotPresenca('${m.id}', ${idx})" class="w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer mx-auto ${bgClass}" title="Clique para alternar status">
                        ${texto}
                    </button>
                </td>
            `;
        }).join('');

        return `
            <tr class="hover:bg-[#201813]/50 transition">
                <td class="p-2.5 font-bold text-amber-100">${m.char_name || '-'}</td>
                <td class="p-2.5 text-amber-400 text-xs">${m.char_class || '-'}</td>
                ${slotsHtml}
                <td class="p-2.5 text-center text-[11px] font-semibold">
                    <span class="text-emerald-400" title="Presenças">${countOk}</span> / 
                    <span class="text-red-400" title="Faltas">${countFalta}</span> / 
                    <span class="text-amber-400" title="Justificadas">${countJust}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function gerarPDFPresenca() {
    if (!cache.length) { alert('Não há dados para gerar o PDF de presença.'); return; }
    let dadosPresenca = obterDadosPresencaStorage();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(14); 
    doc.setTextColor(99, 69, 44);
    doc.text("Controle de Presença Semanal - Guilda Anomalia", 14, 15);

    doc.setFontSize(8); 
    doc.setTextColor(100);
    doc.text(`Semana do Ano: ${dadosPresenca.semana} | Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 20);

    const rows = cache.map((m, idx) => {
        const slots = dadosPresenca.registros[m.id] || [null, null, null, null, null, null, null];
        const formatarSlotPdf = (s) => s === 'ok' ? 'OK' : s === 'falta' ? 'Falta (X)' : s === 'justificou' ? 'Justificou' : '-';
        
        let cOk = slots.filter(s => s === 'ok').length;
        let cFalta = slots.filter(s => s === 'falta').length;
        let cJust = slots.filter(s => s === 'justificou').length;

        return [
            idx + 1,
            m.char_name || '-',
            m.char_class || '-',
            formatarSlotPdf(slots[0]),
            formatarSlotPdf(slots[1]),
            formatarSlotPdf(slots[2]),
            formatarSlotPdf(slots[3]),
            formatarSlotPdf(slots[4]),
            formatarSlotPdf(slots[5]),
            formatarSlotPdf(slots[6]),
            `${cOk} OK / ${cFalta} Falta / ${cJust} Just`
        ];
    });

    doc.autoTable({
        startY: 24,
        head: [['#', 'Herói', 'Classe', 'Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5', 'Dia 6', 'Dia 7', 'Resumo']],
        body: rows,
        headStyles: { fillColor: [41, 28, 19], textColor: [212, 175, 55], fontStyle: 'bold', halign: 'center', fontSize: 8 },
        bodyStyles: { textColor: [40, 40, 40], fontSize: 8, halign: 'center' },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { halign: 'left', fontStyle: 'bold' }, 2: { halign: 'left' } },
        alternateRowStyles: { fillColor: [248, 245, 240] },
        margin: { horizontal: 14 }
    });

    const pages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pages; i++) {
        doc.setPage(i); 
        doc.setFontSize(7.5); 
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pages}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
    }

    doc.save("controle-presenca-guilda-anomalia.pdf");
}