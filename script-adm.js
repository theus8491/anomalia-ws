const SUPABASE_URL = 'https://tfgjfscnuemunuwzvtjr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vCiz2wBxb7yRfrfhJxYOfg__u3kka3W';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const proscritos = ['Necromante', 'Cavaleiro da Morte', 'Bruxo', 'Encantador', 'Ceifador'];
let cache = [];
let pvpsExpandidos = {}; 

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
    document.getElementById('btnTabMembros').className = isMembros ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    document.getElementById('btnTabPts').className = !isMembros ? "bg-amber-600 text-stone-950 px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer shadow-md flex items-center gap-2" : "bg-[#130f0d] hover:bg-[#201813] text-amber-300 border border-[#63452c] px-4 py-2 rounded-xl font-rpg font-bold text-xs transition cursor-pointer flex items-center gap-2";
    document.getElementById('tabMembros').classList.toggle('hidden', !isMembros);
    document.getElementById('tabPts').classList.toggle('hidden', isMembros);
    if (!isMembros && cache.length === 0) await carregarMembros();
    else if (!isMembros) renderPts();
}

async function carregarMembros() {
    document.getElementById('statusMensagem').textContent = 'Buscando dados...';
    const { data, error } = await _supabase.from('guild_members').select('*').order('created_at', { ascending: false });
    if (error) { document.getElementById('statusMensagem').textContent = 'Erro: ' + error.message; return; }
    document.getElementById('statusMensagem').textContent = '';
    cache = data || [];
    renderResumoClasses(cache);
    const filtro = document.getElementById('filtroClasse').value;
    const busca = document.getElementById('buscaNome').value.toLowerCase().trim();
    render(cache.filter(m => (filtro === 'todos' || m.char_class === filtro) && (!busca || (m.char_name || '').toLowerCase().includes(busca))));
    if (!document.getElementById('tabPts').classList.contains('hidden')) renderPts();
}

const filtrarPorClasse = (classe) => { document.getElementById('filtroClasse').value = classe; carregarMembros(); };

function renderResumoClasses(dados) {
    const container = document.getElementById('adminClassSummary');
    if (!container) return;
    if (!dados.length) { container.innerHTML = '<span class="text-amber-500/60 text-xs col-span-full">Nenhum herói cadastrado.</span>'; return; }
    const counts = dados.reduce((acc, curr) => { acc[curr.char_class || 'Outros'] = (acc[curr.char_class || 'Outros'] || 0) + 1; return acc; }, {});
    const filtroAtual = document.getElementById('filtroClasse').value;

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

const formatItemPrevia = (nome, obj) => {
    const naoTem = !obj || obj.nao_tem || (typeof obj === 'string' && ['não tenho', 'nao tenho', '-', ''].includes(obj.toLowerCase()));
    return `<div class="flex justify-between bg-[#130f0d] px-2 py-1 rounded text-[10px] border ${naoTem ? 'border-red-950/20 text-red-400' : 'border-purple-900/30 text-amber-200'}"><span class="text-amber-500/80">${nome}:</span> <span>${formatItem(obj)}</span></div>`;
};

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
            didParseCell: function (data) {
                if (data.section === 'body') {
                    const slotColors = [
                        { fill: [218, 218, 218], text: [40, 40, 40] },
                        { fill: [200, 230, 205], text: [30, 60, 30] },
                        { fill: [210, 175, 150], text: [60, 30, 20] },
                        { fill: [185, 205, 230], text: [20, 40, 60] },
                        { fill: [242, 228, 160], text: [60, 50, 20] }
                    ];
                    if (slotColors[data.row.index]) {
                        data.cell.styles.fillColor = slotColors[data.row.index].fill;
                        data.cell.styles.textColor = slotColors[data.row.index].text;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
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

_supabase.channel('realtime-guild-members-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'guild_members' }, () => carregarMembros()).subscribe();
carregarMembros();