// Inicialização do Supabase (Substitua com suas chaves reais do projeto)
const SUPABASE_URL = 'SUA_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_SUPABASE_ANON_KEY_AQUI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para atualizar visualmente as estrelas de amplificação
function updateStars(selectId, starsId) {
    const select = document.getElementById(selectId);
    const starsContainer = document.getElementById(starsId);
    if (!select || !starsContainer) return;

    const value = select.value;
    let count = 0;
    
    if (value.includes('+')) {
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

// Função para alternar o estado de "Não tenho" nas Armas
function toggleWeapon(name) {
    const noCheckbox = document.getElementById('no' + name);
    const checkCheckbox = document.getElementById('check' + name);
    const select = document.getElementById('amp' + name);
    
    if (noCheckbox.checked) {
        checkCheckbox.checked = false;
        checkCheckbox.disabled = true;
        select.value = '+0 (Sem amp)';
        select.disabled = true;
        select.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        checkCheckbox.disabled = false;
        select.disabled = false;
        select.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    updateStars('amp' + name, 'stars' + name);
}

// Função para alternar o estado de "Não tenho" nos Acessórios
function toggleAccessory(name) {
    const noCheckbox = document.getElementById('no' + name);
    const checkCheckbox = document.getElementById('check' + name);
    const select = document.getElementById('amp' + name);
    
    if (noCheckbox.checked) {
        checkCheckbox.checked = false;
        checkCheckbox.disabled = true;
        select.value = '+0 (Sem amp)';
        select.disabled = true;
        select.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        checkCheckbox.disabled = false;
        select.disabled = false;
        select.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    updateStars('amp' + name, 'stars' + name);
    updateCounter();
}

// Contador de acessórios equipados
function updateCounter() {
    const accessories = ['Anel1', 'Anel2', 'Bracelete1', 'Bracelete2', 'Amuleto', 'Capa'];
    let count = 0;
    
    accessories.forEach(acc => {
        const check = document.getElementById('check' + acc);
        if (check && check.checked) {
            count++;
        }
    });

    const counterEl = document.getElementById('equippedCounter');
    if (counterEl) {
        counterEl.textContent = `${count} / 6 Equipados`;
    }
}

// Manipulador de envio do formulário principal
document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Captura de Dados Básicos
    const charName = document.getElementById('charName').value.trim();
    const charClass = document.getElementById('charClass').value;
    const talentos35k = document.querySelector('input[name="talentos35k"]:checked')?.value || '';
    const almahadBranch = document.getElementById('almahadBranch').value;
    const charLevel = document.getElementById('charLevel').value;
    const almahadT5 = document.getElementById('almahadT5').value;
    const fullBranches = document.getElementById('fullBranches').value;

    // Captura de Armas
    const weapons = ['T5', 'Calor', 'Pvp'];
    const weaponData = {};
    weapons.forEach(w => {
        weaponData[w] = {
            nao_tenho: document.getElementById('no' + w).checked,
            equipado: document.getElementById('check' + w).checked,
            amplificacao: document.getElementById('amp' + w).value
        };
    });

    // Captura de Acessórios
    const accessories = ['Anel1', 'Anel2', 'Bracelete1', 'Bracelete2', 'Amuleto', 'Capa'];
    const accessoryData = {};
    accessories.forEach(acc => {
        accessoryData[acc] = {
            nao_tenho: document.getElementById('no' + acc).checked,
            equipado: document.getElementById('check' + acc).checked,
            amplificacao: document.getElementById('amp' + acc).value
        };
    });

    const payload = {
        char_name: charName,
        char_class: charClass,
        talentos_35k: talentos35k,
        almahad_branch: almahadBranch,
        char_level: charLevel,
        almahad_t5: almahadT5,
        full_branches: fullBranches,
        weapons: weaponData,
        accessories: accessoryData,
        created_at: new Date()
    };

    try {
        const { error } = await supabaseClient
            .from('guild_members')
            .insert([payload]);

        if (error) throw error;

        alert('Credenciais enviadas com sucesso para a Guilda Anomalia!');
        document.getElementById('itemForm').reset();
        
        // Reset visual de estrelas e contadores
        weapons.forEach(w => updateStars('amp' + w, 'stars' + w));
        accessories.forEach(acc => updateStars('amp' + acc, 'stars' + acc));
        updateCounter();

    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        alert('Erro ao enviar dados para o Supabase. Verifique sua conexão.');
    }
});