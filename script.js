// Inicialização do Supabase com as credenciais corretas
const SUPABASE_URL = 'https://tfgjfscnuemunuwzvtjr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vCiz2wBxb7yRfrfhJxYOfg__u3kka3W';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para atualizar visualmente as estrelas de amplificação
function updateStars(selectId, starsId) {
    const select = document.getElementById(selectId);
    const starsContainer = document.getElementById(starsId);
    if (!select || !starsContainer) return;

    const value = select.value;
    let count = 0;
    
    if (value && value.includes('+')) {
        const match = value.match(/\d+/);
        count = match ? parseInt(match[0]) : 0;
    }

    let starsHTML = '';
    for (let i = 1; i <= 10; i++) {
        if (i <= count) {
            starsHTML += '<span class="text-amber-400">★</span>';
        } else {
            starsHTML += '<span class="text-amber-700/40">★</span>';
        }
    }
    starsContainer.innerHTML = starsHTML;
}

// Função para gerenciar estados de "Não tenho" / "Equipado" em todos os itens
function setupItemToggles() {
    const itemIds = [
        'T5', 'Pve', 'Map5', 'Pvp1', 'Pvp2', 'ShieldPve', 'ShieldPvp',
        'Anel1Pvp', 'Anel2Pvp', 'Bracelete1Pvp', 'Bracelete2Pvp', 'AmuletoPvp', 'CapaPvp',
        'HelmetPvp', 'ChestPvp', 'BootsPvp', 'GlovesPvp',
        'Anel1Pve', 'Anel2Pve', 'Bracelete1Pve', 'Bracelete2Pve', 'AmuletoPve', 'CapaPve',
        'HelmetPve', 'ChestPve', 'BootsPve', 'GlovesPve'
    ];

    itemIds.forEach(id => {
        const noCheckbox = document.getElementById('no' + id);
        const checkCheckbox = document.getElementById('check' + id);
        const ampSelect = document.getElementById('amp' + id);
        
        if (noCheckbox && ampSelect) {
            noCheckbox.addEventListener('change', () => {
                if (noCheckbox.checked) {
                    if (checkCheckbox) {
                        checkCheckbox.checked = false;
                        checkCheckbox.disabled = true;
                    }
                    ampSelect.value = '+0 (Sem amp)';
                    ampSelect.disabled = true;
                    ampSelect.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    if (checkCheckbox) checkCheckbox.disabled = false;
                    ampSelect.disabled = false;
                    ampSelect.classList.remove('opacity-50', 'cursor-not-allowed');
                }
                updateStars('amp' + id, 'stars' + id);
            });
        }

        if (checkCheckbox && noCheckbox) {
            checkCheckbox.addEventListener('change', () => {
                if (checkCheckbox.checked) {
                    noCheckbox.checked = false;
                }
            });
        }
    });
}

// Funções para exibir/ocultar containers de Catacumba e Mermem
function toggleCatacumbaType(show) {
    const container = document.getElementById('catacumbaTypeContainer');
    if (container) {
        container.classList.toggle('hidden', !show);
        if (!show) {
            const select = document.getElementById('catacumbaType');
            if (select) select.value = '';
        }
    }
}

function toggleMermemType(show) {
    const container = document.getElementById('mermemTypeContainer');
    if (container) {
        container.classList.toggle('hidden', !show);
        if (!show) {
            const select = document.getElementById('mermemType');
            if (select) select.value = '';
        }
    }
}

// Inicializa os ouvintes ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
    setupItemToggles();
});

// Manipulador de envio do formulário principal
document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Helper para coletar dados estruturados de cada item
    const getItemData = (id) => {
        const no = document.getElementById('no' + id)?.checked || false;
        const equipado = document.getElementById('check' + id)?.checked || false;
        const amp = document.getElementById('amp' + id)?.value || '+0 (Sem amp)';
        const tipoEl = document.getElementById('type' + id);
        const tipo = tipoEl ? tipoEl.value : '-';
        const levelEl = document.getElementById('level' + id);
        const level = levelEl ? levelEl.value : '-';

        return {
            nao_tem: no,
            equipado: equipado,
            amplificacao: amp,
            tipo: tipo,
            nivel: level
        };
    };

    // Montagem do payload completo para o Supabase
    const payload = {
        char_name: document.getElementById('charName').value.trim(),
        char_class: document.getElementById('charClass').value,
        talentos_35k: document.querySelector('input[name="talentos35k"]:checked')?.value || '-',
        almahad_branch: document.getElementById('almahadBranch').value || '-',
        char_level: document.getElementById('charLevel').value || '-',
        almahad_t5: document.getElementById('almahadT5').value || '-',
        full_branches: document.getElementById('fullBranches').value || '-',

        // Armas & Escudos
        weapon_t5: getItemData('T5'),
        weapon_pve: getItemData('Pve'),
        weapon_map5: getItemData('Map5'),
        weapon_pvp1: getItemData('Pvp1'),
        weapon_pvp2: getItemData('Pvp2'),
        shield_pve: getItemData('ShieldPve'),
        shield_pvp: getItemData('ShieldPvp'),

        // Acessórios PvP
        acc_anel1_pvp: getItemData('Anel1Pvp'),
        acc_anel2_pvp: getItemData('Anel2Pvp'),
        acc_bracelete1_pvp: getItemData('Bracelete1Pvp'),
        acc_bracelete2_pvp: getItemData('Bracelete2Pvp'),
        acc_amuleto_pvp: getItemData('AmuletoPvp'),
        acc_capa_pvp: getItemData('CapaPvp'),

        // Set PvP & Catacumba
        set_helmet_pvp: getItemData('HelmetPvp'),
        set_chest_pvp: getItemData('ChestPvp'),
        set_boots_pvp: getItemData('BootsPvp'),
        set_gloves_pvp: getItemData('GlovesPvp'),
        has_catacumba: document.querySelector('input[name="hasCatacumba"]:checked')?.value === 'sim',
        catacumba_type: document.getElementById('catacumbaType')?.value || '-',

        // Acessórios PvE
        acc_anel1_pve: getItemData('Anel1Pve'),
        acc_anel2_pve: getItemData('Anel2Pve'),
        acc_bracelete1_pve: getItemData('Bracelete1Pve'),
        acc_bracelete2_pve: getItemData('Bracelete2Pve'),
        acc_amuleto_pve: getItemData('AmuletoPve'),
        acc_capa_pve: getItemData('CapaPve'),

        // Set PvE & Mermem (Corrigido para usar getItemData)
        set_helmet_pve: getItemData('HelmetPve'),
        set_chest_pve: getItemData('ChestPve'),
        set_boots_pve: getItemData('BootsPve'),
        set_gloves_pve: getItemData('GlovesPve'),
        has_mermem: document.querySelector('input[name="hasMermem"]:checked')?.value === 'sim',
        mermem_type: document.getElementById('mermemType')?.value || '-',

        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('guild_members')
            .insert([payload]);

        if (error) throw error;

        alert('Herói cadastrado com sucesso para a Guilda Anomalia!');
        document.getElementById('itemForm').reset();
        
        // Reset visual das estrelas e estados condicionais
        const allIds = [
            'T5', 'Pve', 'Map5', 'Pvp1', 'Pvp2', 'ShieldPve', 'ShieldPvp',
            'Anel1Pvp', 'Anel2Pvp', 'Bracelete1Pvp', 'Bracelete2Pvp', 'AmuletoPvp', 'CapaPvp',
            'HelmetPvp', 'ChestPvp', 'BootsPvp', 'GlovesPvp',
            'Anel1Pve', 'Anel2Pve', 'Bracelete1Pve', 'Bracelete2Pve', 'AmuletoPve', 'CapaPve',
            'HelmetPve', 'ChestPve', 'BootsPve', 'GlovesPve'
        ];
        allIds.forEach(id => updateStars('amp' + id, 'stars' + id));
        toggleCatacumbaType(false);
        toggleMermemType(false);

    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        alert('Erro ao enviar dados para o Supabase: ' + error.message);
    }
});
