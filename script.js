// Inicialização do Supabase com as credenciais reais do projeto
const SUPABASE_URL = 'https://krabfzjnejvpatufolma.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VIh6KfT200rJ28XySTS71g_w0tIO4s5';
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
        select.value = 'Não tenho';
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

    // Monta o payload mapeando diretamente para as colunas planas da tabela
    const payload = {
        char_name: document.getElementById('charName').value.trim(),
        char_class: document.getElementById('charClass').value,
        talentos_35k: document.querySelector('input[name="talentos35k"]:checked')?.value || '-',
        almahad_branch: document.getElementById('almahadBranch').value || '-',
        char_level: document.getElementById('charLevel').value || '-',
        almahad_t5: document.getElementById('almahadT5').value || '-',
        full_branches: document.getElementById('fullBranches').value || '-',
        
        // Armas
        amp_t5: document.getElementById('ampT5').value || '-',
        amp_calor: document.getElementById('ampCalor').value || '-',
        amp_pvp: document.getElementById('ampPvp').value || '-',
        
        // Acessórios
        anel1: document.getElementById('ampAnel1').value || 'Não tenho',
        anel2: document.getElementById('ampAnel2').value || 'Não tenho',
        brac1: document.getElementById('ampBracelete1').value || 'Não tenho',
        brac2: document.getElementById('ampBracelete2').value || 'Não tenho',
        amu: document.getElementById('ampAmuleto').value || 'Não tenho',
        capa: document.getElementById('ampCapa').value || 'Não tenho',
        
        created_at: new Date()
    };

    try {
        const { error } = await supabaseClient
            .from('guild_members')
            .insert([payload]);

        if (error) throw error;

        alert('Herói cadastrado com sucesso para a Guilda Anomalia!');
        document.getElementById('itemForm').reset();
        
        // Reset visual de estrelas e contadores
        const weaponsList = ['T5', 'Calor', 'Pvp'];
        const accessoriesList = ['Anel1', 'Anel2', 'Bracelete1', 'Bracelete2', 'Amuleto', 'Capa'];
        
        weaponsList.forEach(w => updateStars('amp' + w, 'stars' + w));
        accessoriesList.forEach(acc => updateStars('amp' + acc, 'stars' + acc));
        updateCounter();

    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        alert('Erro ao enviar dados para o Supabase: ' + error.message);
    }
});