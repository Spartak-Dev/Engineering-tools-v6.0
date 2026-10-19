// ============================================================================
// ui_js 6.0.js — Інтерфейсний модуль Engineering Tools 5.5.6 / 6.0
// Повна підтримка: Li-ion, Si-C, LiFePO4, Lead-Acid, Solar Hybrid, Arsenal v3.0
// ============================================================================

// ============================================================================
// 1. УНІВЕРСАЛЬНІ ФУНКЦІЇ МОДАЛЬНИХ ВІКОН
// ============================================================================
// Онови функцію openModal:
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "block";
        // 🟢 Додаємо стан в історію для відстеження жесту "Назад":
        history.pushState({ modalOpen: modalId }, "");
    }
}

// 🟢 Обробка системного жесту "Назад" на телефоні:
window.addEventListener('popstate', function(event) {
    const modals = document.getElementsByClassName("modal");
    for (let i = 0; i < modals.length; i++) {
        if (modals[i].style.display === "block") {
            modals[i].style.display = "none";
            const resultDiv = document.getElementById(modals[i].id.replace('Modal', 'Result'));
            if (resultDiv) {
                resultDiv.style.display = "none";
                resultDiv.textContent = "";
            }
        }
    }
});

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
        const resultDiv = document.getElementById(modalId.replace('Modal', 'Result'));
        if (resultDiv) {
            resultDiv.style.display = "none";
            resultDiv.textContent = "";
        }
    }
}

window.onclick = function(event) {
    const modals = document.getElementsByClassName("modal");
    for (let i = 0; i < modals.length; i++) {
        if (event.target === modals[i]) {
            modals[i].style.display = "none";
            const resultDiv = document.getElementById(modals[i].id.replace('Modal', 'Result'));
            if (resultDiv) {
                resultDiv.style.display = "none";
                resultDiv.textContent = "";
            }
        }
    }
};



// ============================================================================
// 2. КНОПКА 1 – ЗАРЯДКА ПБ (ДИНАМІКА З УРАХУВАННЯМ Si-C)
// ============================================================================
function togglePbCapacityFields() {
    const know = document.getElementById('pb_know_capacity').value;
    const type = document.getElementById('pb_type')?.value || 'lithium';
    const label = document.getElementById('pb_mah_label');
    const input = document.getElementById('pb_mah');
    
    if (know === 'wh') {
        label.textContent = 'Ємність ПБ (Wh):';
        input.placeholder = (type === 'sic') ? 'Наприклад: 38' : 'Наприклад: 37';
    } else {
        label.textContent = `Ємність ПБ (mAh) [${chem(type).vNom}V]:`;
        input.placeholder = 'Наприклад: 10000';
    }
}

function openCalcPowerbankForm() {
    const typeEl = document.getElementById('pb_type');
    if (typeEl) typeEl.value = 'lithium';
    document.getElementById('pb_mah').value = '';
    document.getElementById('pb_watts').value = '';
    document.getElementById('pb_percent').value = '';
    document.getElementById('pb_know_capacity').value = 'mah';
    togglePbCapacityFields();
    
    ArsenalV3.ensureContainer('calcPowerbankModal', 'arsenal_single_1');
    ArsenalV3.renderSingle('arsenal_single_1', 'SOURCE', 'btn1_pb');
    openModal('calcPowerbankModal');
}

function calcPowerbank() {
    const type = document.getElementById('pb_type')?.value || 'lithium';
    const know = document.getElementById('pb_know_capacity').value;
    const vNom = chem(type).vNom;
    
    let wh = (know === 'wh') 
        ? Number(document.getElementById('pb_mah').value)
        : mahToWh(Number(document.getElementById('pb_mah').value), vNom);

    const watts = Number(document.getElementById('pb_watts').value);
    const p = Number(document.getElementById('pb_percent').value);

    const v = validateFields([
        { name: 'Ємність ПБ', value: wh, positive: true },
        { name: 'Потужність зарядки (W)', value: watts, positive: true },
        { name: 'Поточний % заряду', value: p, min: 0, max: 100 }
    ]);
    if (!v.ok) return alert(v.message);

    const totalMinutes = calculatePowerbankChargeTime(wh, watts, p, type);

    showResultWithShare('calcPowerbankResult', `
        <b>🔋 Результат зарядки (${chem(type).label}):</b><br>
        Повна енергія: <b>${wh.toFixed(1)} Wh</b><br>
        Початковий заряд: <b>${p}%</b><br>
        Потужність зарядки: <b>${watts} W</b><br>
        Час до 100%: <b style="color: #4CAF50; font-size: 1.15em;">${formatTimeWithError(totalMinutes)}</b> <span style="color:#64b5f6; font-weight:bold;">${getTargetTimeText(totalMinutes, 'charge')}</span><br>
        <span style="color: #888; font-size: 11.5px;">
            Фаза спаду струму (CV) починається з ${chem(type).cvStart}%. Розрахунковий ККД: ${(chem(type).effCharge * 100).toFixed(0)}%.
        </span>
    `);
    
    
}

// ============================================================================
// 3. КНОПКА 2 – ЗАРЯДКА LI-ION / SI-C АКУМУЛЯТОРІВ
// ============================================================================
function toggleLiIonCapacityFields() {
    const know = document.getElementById('liion_know_capacity').value;
    const type = document.getElementById('liion_type')?.value || 'lithium';
    const label = document.getElementById('liion_mah_label');
    const input = document.getElementById('liion_mah');
    if (know === 'wh') {
        label.textContent = 'Ємність акумулятора (Wh):';
        input.placeholder = (type === 'sic') ? 'Наприклад: 19' : 'Наприклад: 18.5';
    } else {
        label.textContent = `Ємність акумулятора (mAh) [${chem(type).vNom}V]:`;
        input.placeholder = 'Наприклад: 5000';
    }
}

function openCalcLiIonForm() {
    const typeEl = document.getElementById('liion_type');
    if (typeEl) typeEl.value = 'lithium';
    document.getElementById('liion_mah').value = '';
    document.getElementById('liion_watts').value = '';
    document.getElementById('liion_volts').value = '';
    document.getElementById('liion_amps').value = '';
    document.getElementById('know_power').value = 'yes';
    document.getElementById('liion_know_capacity').value = 'mah';
    toggleLiIonCapacityFields();
    togglePowerFields();

    // 👇 ДОДАНО 2 РЯДКИ:
    ArsenalV3.ensureContainer('calcLiIonModal', 'arsenal_single_2');
    ArsenalV3.renderSingle('arsenal_single_2', 'RECHARGE_TARGET', 'btn2_cell');

    openModal('calcLiIonModal');
}

function togglePowerFields() {
    const know = document.getElementById('know_power').value;
    document.getElementById('power_fields').style.display = (know === 'yes' ? 'block' : 'none');
    document.getElementById('voltage_fields').style.display = (know === 'yes' ? 'none' : 'block');
}

function calcLiIon() {
    const type = document.getElementById('liion_type')?.value || 'lithium';
    const knowCap = document.getElementById('liion_know_capacity').value;
    const vNom = chem(type).vNom;

    let E_wh = (knowCap === 'wh')
        ? Number(document.getElementById('liion_mah').value)
        : mahToWh(Number(document.getElementById('liion_mah').value), vNom);

    const knowPower = document.getElementById('know_power').value;
    let U = 5, A = 1;
    if (knowPower === 'yes') {
        A = Number(document.getElementById('liion_watts').value) / 5;
    } else {
        U = Number(document.getElementById('liion_volts').value);
        A = Number(document.getElementById('liion_amps').value);
    }

    const v = validateFields([
        { name: 'Ємність акумулятора', value: E_wh, positive: true },
        { name: 'Напруга (V)', value: U, positive: true },
        { name: 'Струм (A)', value: A, positive: true }
    ]);
    if (!v.ok) return alert(v.message);

    const baseMins = calculateLiIonChargeTime(E_wh, U, A, type);

    showResultWithShare('calcLiIonResult', `
        <b>⚡ Прогноз зарядки (${chem(type).label}):</b><br>
        Розрахункова енергія: <b>${E_wh.toFixed(1)} Wh</b><br>
        Орієнтовний час зарядки: <b style="color: #4CAF50; font-size: 1.15em;">${formatTimeWithError(baseMins)}</b> <span style="color:#64b5f6; font-weight:bold;">${getTargetTimeText(baseMins, 'charge')}</span>
    `);
}

// ============================================================================
// 4. КНОПКА 3 – ЧАС РОБОТИ (PRO MODE)
// ============================================================================
function openCalcWorkTimeForm() {
    document.getElementById('know_wh').value = 'yes';
    document.getElementById('worktime_wh').value = '';
    document.getElementById('worktime_mah').value = '';
    document.getElementById('worktime_v').value = '3.7';
    if (document.getElementById('worktime_percent')) document.getElementById('worktime_percent').value = '100'; // 🟢 скидання на 100%
    document.getElementById('worktime_maxw').value = '';
    document.getElementById('worktime_count').value = '';
    document.getElementById('consumers_container').innerHTML = '';
    toggleWhFields();

    ArsenalV3.ensureContainer('calcWorkTimeModal', 'arsenal_single_3');
    ArsenalV3.ensureContainer('calcWorkTimeModal', 'arsenal_multi_3', '#consumers_container');
    ArsenalV3.renderSingle('arsenal_single_3', 'SOURCE', 'btn3_pb');
    ArsenalV3.renderMulti('arsenal_multi_3', 'LOAD', 'btn3_consumers');
    openModal('calcWorkTimeModal');
}

function toggleWhFields() {
    const know = document.getElementById('know_wh').value;
    document.getElementById('wh_field').style.display = (know === 'yes' ? 'block' : 'none');
    document.getElementById('mah_v_fields').style.display = (know === 'yes' ? 'none' : 'block');
    updateConsumerFields();
}

function updateConsumerFields() {
    const count = Number(document.getElementById('worktime_count').value) || 0;
    const container = document.getElementById('consumers_container');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label>Споживач №${i}: Знаєте потужність (W)?</label>
            <select id="consumer_${i}_know" onchange="toggleConsumerFields(${i})">
                <option value="yes">Так</option>
                <option value="no">Ні (V та A)</option>
            </select>
            <div id="consumer_${i}_w_field">
                <label>Потужність (W):</label>
                <input type="number" id="consumer_${i}_w">
            </div>
            <div id="consumer_${i}_va_fields" style="display: none;">
                <label>V:</label> <input type="number" id="consumer_${i}_v">
                <label>A:</label> <input type="number" id="consumer_${i}_a">
            </div>
        `;
        container.appendChild(div);
    }
}

function toggleConsumerFields(index) {
    const know = document.getElementById(`consumer_${index}_know`).value;
    document.getElementById(`consumer_${index}_w_field`).style.display = (know === 'yes' ? 'block' : 'none');
    document.getElementById(`consumer_${index}_va_fields`).style.display = (know === 'yes' ? 'none' : 'block');
}

function calcWorkTime() {
    let wh = document.getElementById('know_wh').value === 'yes'
        ? Number(document.getElementById('worktime_wh').value)
        : mahToWh(
            Number(document.getElementById('worktime_mah').value),
            Number(document.getElementById('worktime_v').value)
          );

    const vWh = validateFields([{ name: 'Ємність павербанку', value: wh, positive: true }]);
    if (!vWh.ok) return alert(vWh.message);

    // 🟢 Зчитуємо % заряду (за замовчуванням 100%):
    const p = Number(document.getElementById('worktime_percent')?.value) || 100;
    const vP = validateFields([{ name: 'Поточний % заряду', value: p, min: 0, max: 100 }]);
    if (!vP.ok) return alert(vP.message);

    let count = Number(document.getElementById('worktime_count').value);
    const vCount = validateFields([{ name: 'Кількість споживачів', value: count, min: 1 }]);
    if (!vCount.ok) return alert(vCount.message);
    let totalW = 0;
    for (let i = 1; i <= count; i++) {
        const knowType = document.getElementById(`consumer_${i}_know`).value;
        let consumerW = 0;

        if (knowType === 'yes') {
            consumerW = Number(document.getElementById(`consumer_${i}_w`).value);
            const vC = validateFields([{ name: `Споживач №${i} (W)`, value: consumerW, positive: true }]);
            if (!vC.ok) return alert(vC.message);
        } else {
            const vV = Number(document.getElementById(`consumer_${i}_v`).value);
            const vA = Number(document.getElementById(`consumer_${i}_a`).value);
            const vC = validateFields([
                { name: `Споживач №${i} (напруга, V)`, value: vV, positive: true },
                { name: `Споживач №${i} (струм, A)`, value: vA, positive: true }
            ]);
            if (!vC.ok) return alert(vC.message);
            consumerW = vV * vA;
        }
        totalW += consumerW;
    }

    // 🟢 Чесна енергія з урахуванням % заряду та ККД перетворювача (85%):
    const effDischarge = 0.85;
    const currentWh = wh * (p / 100);
    const usableWh = currentWh * effDischarge;

    let mins = calculateSimpleTime(usableWh, totalW || 1);

    showResultWithShare('calcWorkTimeResult', `
        <b>⏱ Час роботи (Pro Mode):</b><br>
        Загальне навантаження: <b>${totalW.toFixed(1)} W</b><br>
        Час роботи: <b style="color:#4CAF50; font-size:1.2em;">${formatTimeWithError(mins)}</b> <span style="color:#ff9900; font-weight:bold;">${getTargetTimeText(mins, 'discharge')}</span>
    `);
}

// ============================================================================
// 5. КНОПКА 4 – СКІЛЬКИ БУЛО / НЕ БУЛО СВІТЛА?
// ============================================================================

// 🟢 Перемикання тексту форми (Розряд vs Зарядка від розетки)
function toggleLightMode() {
    const mode = document.getElementById('light_mode')?.value || 'outage';
    const label = document.getElementById('light_w_label');
    const input = document.getElementById('light_w');
    
    if (mode === 'restored') {
        if (label) label.textContent = 'Потужність зарядного пристрою від розетки (W):';
        if (input) input.placeholder = 'Наприклад: 18 (для ПБ) або 200 (для станції)';
    } else {
        if (label) label.textContent = 'Потужність споживача (W, роутер/лампа):';
        if (input) input.placeholder = 'Наприклад: 5 або 10';
    }
}

function openCalcLightTimeForm() {
    if (document.getElementById('light_mode')) document.getElementById('light_mode').value = 'outage';
    document.getElementById('light_type').value = 'lithium';
    document.getElementById('light_capacity_value').value = '';
    document.getElementById('light_p1').value = '';
    document.getElementById('light_p2').value = '';
    document.getElementById('light_w').value = '';
    document.getElementById('lead_unit_select').value = 'wh';
    toggleLightCapacityFields();
    toggleLightMode();

    ArsenalV3.ensureContainer('calcLightTimeModal', 'arsenal_single_4');
    ArsenalV3.renderSingle('arsenal_single_4', 'SOURCE', 'btn4_light');
    openModal('calcLightTimeModal');
}

function toggleLightCapacityFields() {
    const type = document.getElementById('light_type').value;
    const label = document.getElementById('light_capacity_label');
    const input = document.getElementById('light_capacity_value');
    const leadUnitSelect = document.getElementById('lead_unit_select');
    const leadVoltageField = document.getElementById('lead_voltage_field');
    const knowCapGroup = document.getElementById('light_know_capacity_group');
    const knowCap = document.getElementById('light_know_capacity')?.value || 'mah';
    
    leadUnitSelect.style.display = 'none';
    leadVoltageField.style.display = 'none';
    if (knowCapGroup) knowCapGroup.style.display = 'none';
    
    if (type === 'lifepo4') {
        label.textContent = 'Ємність у Wh:';
        input.placeholder = 'Наприклад: 37';
    } else if (type === 'lead_acid') {
        label.textContent = 'Ємність:';
        input.placeholder = 'Введіть значення';
        leadUnitSelect.style.display = 'block';
        toggleLeadVoltageField();
    } else {
        if (knowCapGroup) knowCapGroup.style.display = 'block';
        const vNom = chem(type).vNom;
        if (knowCap === 'wh') {
            label.textContent = `Ємність ${chem(type).label} (Wh):`;
            input.placeholder = (type === 'sic') ? 'Наприклад: 38' : 'Наприклад: 37';
        } else {
            label.textContent = `Ємність ${chem(type).label} (mAh) [${vNom}V]:`;
            input.placeholder = 'Наприклад: 10000';
        }
    }
}

function toggleLeadVoltageField() {
    const leadUnit = document.getElementById('lead_unit_select').value;
    const leadVoltageField = document.getElementById('lead_voltage_field');
    leadVoltageField.style.display = (leadUnit === 'ah') ? 'block' : 'none';
}

// 🟢 ОНОВЛЕНИЙ РОЗРАХУНОК (Детектив у два боки)
function calcLightTime() {
    const mode = document.getElementById('light_mode')?.value || 'outage';
    const type = document.getElementById('light_type').value;
    const value = Number(document.getElementById('light_capacity_value').value);
    
    let unit = 'mah';
    let voltage = null;
    
    if (type === 'lifepo4') {
        unit = 'wh';
    } else if (type === 'lead_acid') {
        unit = document.getElementById('lead_unit_select').value;
        if (unit === 'ah') {
            voltage = Number(document.getElementById('lead_voltage').value);
            const vV = validateFields([{ name: 'Напруга (V)', value: voltage, positive: true }]);
            if (!vV.ok) return alert(vV.message);
        }
    } else {
        unit = document.getElementById('light_know_capacity')?.value || 'mah';
    }
    
    const capacityWh = getCapacityWh({ type, unit, value, voltage });
    const p1 = Number(document.getElementById('light_p1').value);
    const p2 = Number(document.getElementById('light_p2').value);
    const w = Number(document.getElementById('light_w').value);

    const v = validateFields([
        { name: 'Ємність', value: capacityWh, positive: true },
        { name: '% заряду на початку', value: p1, min: 0, max: 100 },
        { name: '% заряду в кінці', value: p2, min: 0, max: 100 },
        { name: 'Потужність (W)', value: w, positive: true }
    ]);
    if (!v.ok) return alert(v.message);

    const deltaPercent = Math.abs(p2 - p1) / 100;
    if (deltaPercent === 0) {
        return alert('⚠️ Початковий і кінцевий % однакові! Для розрахунку має бути зміна заряду.');
    }

    let mins = 0;
    let titleText = '';
    let detailText = '';

    if (mode === 'outage') {
        // 🔴 СЦЕНАРІЙ 1: Світла НЕ БУЛО (Акумулятор живив роутер/лампу)
        const effDischarge = chem(type).effDischarge;
        const dischargedWh = capacityWh * deltaPercent * effDischarge;
        mins = (dischargedWh / w) * 60;
        
        titleText = '🔴 Світла НЕ було:';
        detailText = `Витрачено енергії: <b>${dischargedWh.toFixed(1)} Wh</b> (ККД розряду ${(effDischarge * 100).toFixed(0)}%)`;
    } else {
        // 🟢 СЦЕНАРІЙ 2: Світло БУЛО (Акумулятор заряджався в розетці)
        const neededWh = capacityWh * deltaPercent;
        const effCharge = chem(type).effCharge;
        const effPower = w * effCharge;
        
        const maxP = Math.max(p1, p2);
        const cvStart = chem(type).cvStart;
        const penalty = (maxP > cvStart) ? (type === 'lead_acid' ? 2.0 : 1.3) : 1.0;
        
        mins = ((neededWh / effPower) * 60) * penalty;
        
        titleText = '🟢 Світло БУЛО в мережі:';
        detailText = `Увібрано енергії: <b>${neededWh.toFixed(1)} Wh</b> (засвоєно ${effPower.toFixed(1)} W, ККД ${(effCharge * 100).toFixed(0)}%)`;
    }

    // 🟢 ВІДМОТУВАННЯ ЧАСУ НАЗАД З ПРАВИЛЬНИМ ТЕКСТОМ:
    const pastDate = new Date(Date.now() - mins * 60 * 1000);
    const pastH = String(pastDate.getHours()).padStart(2, '0');
    const pastM = String(pastDate.getMinutes()).padStart(2, '0');
    const timeStr = `${pastH}:${pastM}`;

    const clockPast = (mode === 'outage')
        ? `(якщо дали щойно — зникло о ${timeStr})`
        : `(якщо вимкнули щойно — увімкнули о ${timeStr})`;

    showResultWithShare('calcLightTimeResult', `
        <b>💡 Детектив мережі (${chem(type).label}):</b><br>
        ${titleText} <b style="color: #4CAF50; font-size: 1.25em;">${formatTimeWithError(mins)}</b> <span style="color:#64b5f6; font-size:12px; font-weight:bold;">${clockPast}</span><br>
        <span style="color: #bbb; font-size: 11.5px;">${detailText}</span><br>
        <span style="color: #888; font-size: 11px;">Діапазон заряду: <b>${p1}% ➔ ${p2}%</b></span>
    `);
}

// ============================================================================
// 6. КНОПКА 5 – АНАЛІЗ ЗАРЯДОК
// ============================================================================
function openCalcChargeStatsForm() {
    const typeEl = document.getElementById('charge_stats_pb_type');
    if (typeEl) typeEl.value = 'lithium';
    document.getElementById('know_pb_wh').value = 'yes';
    document.getElementById('charge_stats_wh').value = '';
    document.getElementById('charge_stats_mah').value = '';
    document.getElementById('charge_stats_p2').value = '';
    document.getElementById('charge_stats_p4').value = '';
    document.getElementById('charge_stats_charge_power').value = '';
    document.getElementById('charge_devices_container').innerHTML = '';
    togglePbWhFields();

    ArsenalV3.ensureContainer('calcChargeStatsModal', 'arsenal_single_5_pb');
    ArsenalV3.ensureContainer('calcChargeStatsModal', 'arsenal_multi_5', '#charge_devices_container');
    ArsenalV3.renderSingle('arsenal_single_5_pb', 'SOURCE', 'btn5_pb');
    ArsenalV3.renderMulti('arsenal_multi_5', 'RECHARGE_TARGET', 'btn5_chargestats');
    openModal('calcChargeStatsModal');
}

function togglePbWhFields() {
    const know = document.getElementById('know_pb_wh').value;
    document.getElementById('pb_wh_field').style.display = (know === 'yes' ? 'block' : 'none');
    document.getElementById('pb_mah_field').style.display = (know === 'yes' ? 'none' : 'block');
    updateChargeDeviceFields();
}

function updateChargeDeviceFields() {
    const count = Number(document.getElementById('charge_stats_p4').value) || 0;
    const container = document.getElementById('charge_devices_container');
    if (!container) return;
    
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.border = '1px solid #444';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <label style="color: #ff9900;">Споживач №${i}:</label>
            <label>Знаєте Wh?</label>
            <select id="device_${i}_know_wh" onchange="toggleDeviceWhFields(${i})" style="margin-bottom: 8px;">
                <option value="yes">Так (Wh)</option>
                <option value="no">mAh</option>
            </select>
            <div id="device_${i}_wh_field">
                <label>Wh:</label><input type="number" id="device_${i}_wh" placeholder="Наприклад: 15" style="width: 100%; margin-bottom: 8px;">
            </div>
            <div id="device_${i}_mah_field" style="display: none;">
    <label>mAh:</label>
    <input type="number" id="device_${i}_mah" placeholder="Наприклад: 4000" style="width: 100%; margin-bottom: 8px;">
    <label>Хімія споживача:</label>
    <select id="device_${i}_chem" style="width: 100%; margin-bottom: 8px;">
        <option value="lithium">Li-ion (3.7V)</option>
        <option value="sic">Si-C (3.8V)</option>
        <option value="lifepo4">LiFePO4 (3.2V)</option>
        <option value="lead_acid">Свинець (12V)</option>
    </select>
</div>
            <label>Поточний % заряду споживача:</label>
            <input type="number" id="device_${i}_p" placeholder="Наприклад: 20" style="width: 100%;">
        `;
        container.appendChild(div);
    }
}

function toggleDeviceWhFields(index) {
    const know = document.getElementById(`device_${index}_know_wh`).value;
    document.getElementById(`device_${index}_wh_field`).style.display = (know === 'yes' ? 'block' : 'none');
    document.getElementById(`device_${index}_mah_field`).style.display = (know === 'yes' ? 'none' : 'block');
}

function calcChargeStats() {
    const pbType = document.getElementById('charge_stats_pb_type')?.value || 'lithium';
    const knowPbWh = document.getElementById('know_pb_wh').value;
    const pbVNom = chem(pbType).vNom;
    const pbEff = getChargeEfficiency(pbType);

    let pbCapacityWh = (knowPbWh === 'yes')
        ? Number(document.getElementById('charge_stats_wh').value)
        : mahToWh(Number(document.getElementById('charge_stats_mah').value), pbVNom);

    const pbCurrentPercent = Number(document.getElementById('charge_stats_p2').value);
    const chargePower = Number(document.getElementById('charge_stats_charge_power').value);
    const deviceCount = Number(document.getElementById('charge_stats_p4').value) || 0;

    const vGeneral = validateFields([
        { name: 'Ємність ПБ', value: pbCapacityWh, positive: true },
        { name: 'Поточний % заряду ПБ', value: pbCurrentPercent, min: 0, max: 100 },
        { name: 'Потужність зарядки (W)', value: chargePower, positive: true },
        { name: 'Кількість споживачів', value: deviceCount, min: 1 }
    ]);
    if (!vGeneral.ok) return alert(vGeneral.message);
    
    let tempPB_Wh = pbCapacityWh * (pbCurrentPercent / 100);
    const effPower = chargePower * pbEff;
    let totalTimeMinutes = 0;
    let devicesReport = [];
    
    for (let i = 1; i <= deviceCount; i++) {
        const knowDeviceWh = document.getElementById(`device_${i}_know_wh`).value;
        let deviceCapacityWh = (knowDeviceWh === 'yes')
            ? Number(document.getElementById(`device_${i}_wh`).value)
            : mahToWh(
    Number(document.getElementById(`device_${i}_mah`).value),
    chem(document.getElementById(`device_${i}_chem`).value).vNom
  );
        
        const deviceCurrentPercent = Number(document.getElementById(`device_${i}_p`).value) || 0;
        const vDevice = validateFields([
            { name: `Споживач №${i} (ємність)`, value: deviceCapacityWh, positive: true },
            { name: `Споживач №${i} (% заряду)`, value: deviceCurrentPercent, min: 0, max: 100 }
        ]);
        if (!vDevice.ok) return alert(vDevice.message);
        
        const deviceCurrentWh = deviceCapacityWh * (deviceCurrentPercent / 100);
        const neededWh = deviceCapacityWh - deviceCurrentWh;
        const neededFromBank = neededWh / pbEff;
        
        let finalPercent = 0;
        let chargeTimeHours = 0;
        
        if (tempPB_Wh >= neededFromBank) {
            finalPercent = 100;
            if (deviceCurrentPercent < 80) {
                const whTo80 = (deviceCapacityWh * 0.8) - deviceCurrentWh;
                const whAfter80 = deviceCapacityWh * 0.2;
                chargeTimeHours = (whTo80 / effPower) + (whAfter80 / effPower * CCCV_FACTORS.CV_PENALTY);
            } else {
                chargeTimeHours = (neededWh / effPower) * CCCV_FACTORS.CV_PENALTY;
            }
            tempPB_Wh -= neededFromBank;
        } else {
            const availableWh = tempPB_Wh * pbEff;
            finalPercent = ((deviceCurrentWh + availableWh) / deviceCapacityWh) * 100;
            if (finalPercent <= 80) {
                chargeTimeHours = availableWh / effPower;
            } else {
                const whTo80 = Math.max(0, (deviceCapacityWh * 0.8) - deviceCurrentWh);
                const whInCV = availableWh - whTo80;
                chargeTimeHours = (whTo80 / effPower) + (whInCV / effPower * CCCV_FACTORS.CV_PENALTY);
            }
            tempPB_Wh = 0;
        }
        
        const minutes = Math.round(chargeTimeHours * 60);
        totalTimeMinutes += minutes;

        // 🟢 ОСЬ ТУТ: формуємо час готовності саме для цього пристрою:
        const readyAtTime = getTargetTimeText(totalTimeMinutes, 'charge');
        devicesReport.push({ 
            num: i, 
            finalPercent: finalPercent.toFixed(1), 
            time: formatTime(minutes),
            readyAt: readyAtTime 
        });
    }
    
    const finalPBPercent = (tempPB_Wh / pbCapacityWh) * 100;
    const totalH = Math.floor(totalTimeMinutes / 60);
    const totalM = totalTimeMinutes % 60;
    
    let devicesHtml = devicesReport.map(d => 
        `<div style="border-bottom: 1px solid #444; padding: 6px 0;">
            🔹 Споживач №${d.num}: зарядиться до <b>${d.finalPercent}%</b> (≈${d.time}) <span style="color:#64b5f6; font-size:11.5px;">${d.readyAt}</span>
        </div>`
    ).join('');

    showResultWithShare('calcChargeStatsResult', `
        <b>📊 ЗВІТ РОЗПОДІЛУ ЗАРЯДУ (${chem(pbType).label}):</b><br>
        Початкова енергія ПБ: ${(pbCapacityWh * (pbCurrentPercent / 100)).toFixed(1)} Wh<br>
        <b>Залишок ПБ:</b> <b style="color:#4CAF50;">${finalPBPercent.toFixed(1)}%</b> (${tempPB_Wh.toFixed(1)} Wh)<br><br>
        ${devicesHtml}<br>
        <b>⏱ Загальний час:</b> ${totalH}г ${totalM}хв <span style="color:#4CAF50; font-weight:bold;">${getTargetTimeText(totalTimeMinutes, 'charge')}</span>
    `);
}

// ============================================================================
// 7. КНОПКА 6 – РОБОТА ЛІХТАРИКА
// ============================================================================
function toggleFlashlightCapacityFields() {
    const know = document.getElementById('flashlight_know_capacity').value;
    const type = document.getElementById('flashlight_type')?.value || 'lithium';
    const label = document.getElementById('flashlight_mah_label');
    const input = document.getElementById('flashlight_mah');
    if (know === 'wh') {
        label.textContent = 'Ємність акумулятора (Wh):';
        input.placeholder = (type === 'sic') ? 'Наприклад: 19' : 'Наприклад: 18.5';
    } else {
        label.textContent = `Ємність акумулятора (mAh) [${chem(type).vNom}V]:`;
        input.placeholder = 'Наприклад: 5000';
    }
}

function initFlashlightCategories() {
    const select = document.getElementById('flashlight_chip_category');
    if (!select || typeof LED_CHIP_CATEGORIES === 'undefined') return;
    select.innerHTML = '<option value="">-- Оберіть тип --</option>' +
        LED_CHIP_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
}

function toggleFlashlightMode() {
    const mode = document.getElementById('flashlight_mode').value;
    document.getElementById('flashlight_chip_section').style.display = (mode === 'chip') ? 'block' : 'none';
    document.getElementById('flashlight_manual_section').style.display = (mode === 'manual') ? 'block' : 'none';
    document.getElementById('flashlight_driver_section').style.display = (mode === 'standard') ? 'none' : 'block';
}

function updateFlashlightChipList() {
    const category = document.getElementById('flashlight_chip_category').value;
    const modelSelect = document.getElementById('flashlight_chip_model');
    const infoDiv = document.getElementById('flashlight_chip_info');

    if (!category || typeof LED_CHIPS === 'undefined') {
        modelSelect.innerHTML = '<option value="">-- Спочатку оберіть тип --</option>';
        infoDiv.style.display = 'none';
        return;
    }

    const chips = LED_CHIPS[category] || [];
    modelSelect.innerHTML = '<option value="">-- Оберіть модель --</option>' +
        chips.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    infoDiv.style.display = 'none';
}

function updateFlashlightChipInfo() {
    const category = document.getElementById('flashlight_chip_category').value;
    const chipId = document.getElementById('flashlight_chip_model').value;
    const infoDiv = document.getElementById('flashlight_chip_info');

    if (!category || !chipId || typeof LED_CHIPS === 'undefined') {
        infoDiv.style.display = 'none';
        return;
    }

    const chip = LED_CHIPS[category]?.find(c => c.id === chipId);
    if (!chip) return;

    const ratio = getChipLumensPerWatt(chip);
    infoDiv.textContent = `ℹ️ ${ratio.toFixed(1)} лм/Вт (max ${chip.maxLumens} lm, ${chip.maxWatts} W)`;
    infoDiv.style.display = 'block';
}
// Стандартні дефолтні пресети
const DEFAULT_FLASHLIGHT_PRESETS = [
    { label: '🕯️ Еко', lumens: 30 },
    { label: '💡 Сер.', lumens: 150 },
    { label: '🔦 Вис.', lumens: 400 },
    { label: '🚨 Турбо', lumens: 1000 }
];

// Малювання кнопок пресетів (дефолтних або кастомних з Арсеналу)
function renderFlashlightPresets(presets = DEFAULT_FLASHLIGHT_PRESETS) {
    const container = document.getElementById('flashlight_presets_container');
    if (!container) return;

    container.style.gridTemplateColumns = `repeat(${presets.length}, 1fr)`;
    container.innerHTML = presets.map((p, idx) => `
        <button type="button" class="btn-preset" id="fl_preset_btn_${idx}" onclick="applyLightPreset(${p.lumens}, '${escapeHtml(p.label)}')">
            ${escapeHtml(p.label)}<br>
            <small style="font-size: 9px; opacity: 0.85;">${p.lumens} lm</small>
        </button>
    `).join('');
}

function applyLightPreset(lumens, label) {
    const input = document.getElementById('flashlight_lm');
    const hint = document.getElementById('flashlight_preset_hint');
    
    if (input) {
        input.value = lumens;
    }
    if (hint) {
        hint.innerHTML = `Вибрано режим: <b>${label} (${lumens} lm)</b>. Ви можете відкоригувати число вручну.`;
    }

    // Підсвітка активної кнопки
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

function clearFlashlightPresetHighlight() {
    const hint = document.getElementById('flashlight_preset_hint');
    if (hint) {
        hint.innerHTML = `💡 Введено власне значення. Натисніть кнопку вище, якщо хочете повернути пресет.`;
    }
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
}
function openCalcFlashlightForm() {
    const typeEl = document.getElementById('flashlight_type');
    if (typeEl) typeEl.value = 'lithium';
    document.getElementById('flashlight_mah').value = '';
    document.getElementById('flashlight_percentage').value = '';
    document.getElementById('flashlight_lm').value = '';
    document.getElementById('flashlight_know_capacity').value = 'mah';
    document.getElementById('flashlight_mode').value = 'standard';
    document.getElementById('flashlight_chip_category').value = '';
    document.getElementById('flashlight_chip_model').innerHTML = '<option value="">-- Спочатку оберіть тип --</option>';
    document.getElementById('flashlight_chip_info').style.display = 'none';
    document.getElementById('flashlight_manual_watts').value = '';
    document.getElementById('flashlight_driver_eff').value = '85';

    toggleFlashlightCapacityFields();
    toggleFlashlightMode();

    // 🟢 Малюємо дефолтні 4 кнопки-пресети:
    renderFlashlightPresets(DEFAULT_FLASHLIGHT_PRESETS);
    const hint = document.getElementById('flashlight_preset_hint');
    if (hint) hint.innerHTML = '💡 Натисніть режим для швидкого заповнення або вкажіть точні люмени вручну.';

    ArsenalV3.ensureContainer('calcFlashlightModal', 'arsenal_single_6');
    ArsenalV3.renderSingle('arsenal_single_6', 'LIGHTING', 'btn6_light');
    openModal('calcFlashlightModal');
}

function calcFlashlight() {
    const type = document.getElementById('flashlight_type')?.value || 'lithium';
    const know = document.getElementById('flashlight_know_capacity').value;
    const vNom = chem(type).vNom;
    
    let whFull = (know === 'wh')
        ? Number(document.getElementById('flashlight_mah').value)
        : mahToWh(Number(document.getElementById('flashlight_mah').value), vNom);

    const p = Number(document.getElementById('flashlight_percentage').value);
    const lm = Number(document.getElementById('flashlight_lm').value);
    const mode = document.getElementById('flashlight_mode').value;

    const vBase = validateFields([
        { name: 'Ємність акумулятора', value: whFull, positive: true },
        { name: 'Поточний % заряду', value: p, min: 0, max: 100 },
        { name: 'Бажана яскравість (lm)', value: lm, positive: true }
    ]);
    if (!vBase.ok) return alert(vBase.message);

    const res = document.getElementById('calcFlashlightResult');
    let mins = 0;
    let modeText = '';

    if (mode === 'standard') {
        mins = calculateFlashlightTime(whFull, p, lm, type);
        modeText = `Стандарт (100 лм/Вт, ${chem(type).label})`;
    } else if (mode === 'chip') {
        const category = document.getElementById('flashlight_chip_category').value;
        const chipId = document.getElementById('flashlight_chip_model').value;
        if (!category || !chipId) return alert('Оберіть тип і модель чіпа');

        const driverEff = Number(document.getElementById('flashlight_driver_eff').value) / 100;
        const chip = LED_CHIPS[category]?.find(c => c.id === chipId);
        if (!chip) return alert('Чіп не знайдено');

        mins = calculateFlashlightTimeFromChip(whFull, p, lm, chip, driverEff, type);
        modeText = `Чіп: ${chip.name} (${chem(type).label}, Драйвер ${(driverEff*100).toFixed(0)}%)`;
    } else if (mode === 'manual') {
        const watts = Number(document.getElementById('flashlight_manual_watts').value);
        const driverEff = Number(document.getElementById('flashlight_driver_eff').value) / 100;
        const vM = validateFields([{ name: 'Споживання (W)', value: watts, positive: true }]);
        if (!vM.ok) return alert(vM.message);

        mins = calculateFlashlightTimeFromWatts(whFull, p, watts, driverEff, type);
        modeText = `Вручну (${watts}W, ${chem(type).label})`;
    }

    showResultWithShare('calcFlashlightResult', `
        <b>⏱ Час роботи:</b> <b style="color: #4CAF50; font-size: 1.15em;">${formatTime(mins)}</b> <span style="color:#ff9900; font-weight:bold;">${getTargetTimeText(mins, 'discharge')}</span><br>
        <span style="color: #888; font-size: 11.5px;">Хімія: ${chem(type).label} (DoD: ${(chem(type).dod*100).toFixed(0)}%) | ${modeText}</span>
    `);
}

// ============================================================================
// 8. КНОПКА 7 – РЕЖИМ ВИЖИВАННЯ (ПЛАНУВАННЯ)
// ============================================================================
function openSurvivalModeForm() {
    document.getElementById('survival_type').value = 'lithium';
    document.getElementById('survival_capacity_value').value = '';
    document.getElementById('survival_p').value = '';
    document.getElementById('survival_hours_needed').value = '';
    document.getElementById('survival_lead_unit').value = 'wh';
    document.getElementById('survival_know_capacity').value = 'mah';

    // 🟢 Скидання сонячного бонуса при звичайному відкритті вручну:
    if (document.getElementById('survival_solar_box')) document.getElementById('survival_solar_box').style.display = 'none';
    if (document.getElementById('survival_solar_wh')) document.getElementById('survival_solar_wh').value = '';

    toggleSurvivalCapacityFields();

    ArsenalV3.ensureContainer('survivalModeModal', 'arsenal_single_7');
    ArsenalV3.renderSingle('arsenal_single_7', 'SOURCE', 'btn7_battery');
    openModal('survivalModeModal');
}

function toggleSurvivalCapacityFields() {
    const type = document.getElementById('survival_type').value;
    const label = document.getElementById('survival_capacity_label');
    const input = document.getElementById('survival_capacity_value');
    const leadUnitSelect = document.getElementById('survival_lead_unit');
    const voltageField = document.getElementById('survival_voltage_field');
    const knowCapGroup = document.getElementById('survival_know_capacity_group');
    const knowCap = document.getElementById('survival_know_capacity').value;
    
    leadUnitSelect.style.display = 'none';
    voltageField.style.display = 'none';
    knowCapGroup.style.display = 'none';
    
    if (type === 'lifepo4') {
        label.textContent = 'Ємність у Wh:';
        input.placeholder = 'Наприклад: 37';
    } else if (type === 'lead_acid') {
        label.textContent = 'Ємність:';
        input.placeholder = 'Введіть значення';
        leadUnitSelect.style.display = 'block';
        toggleSurvivalVoltageField();
    } else {
        knowCapGroup.style.display = 'block';
        const vNom = chem(type).vNom;
        if (knowCap === 'wh') {
            label.textContent = `Ємність ${chem(type).label} (Wh):`;
            input.placeholder = 'Наприклад: 38';
        } else {
            label.textContent = `Ємність ${chem(type).label} (mAh) [${vNom}V]:`;
            input.placeholder = 'Наприклад: 10000';
        }
    }
}

function toggleSurvivalVoltageField() {
    const leadUnit = document.getElementById('survival_lead_unit').value;
    document.getElementById('survival_voltage_field').style.display = (leadUnit === 'ah') ? 'block' : 'none';
}

function survivalMode() {
    const type = document.getElementById('survival_type').value;
    const value = Number(document.getElementById('survival_capacity_value').value);
    
    let unit = 'mah';
    let voltage = null;
    
    if (type === 'lifepo4') {
        unit = 'wh';
    } else if (type === 'lead_acid') {
        unit = document.getElementById('survival_lead_unit').value;
        if (unit === 'ah') {
            voltage = Number(document.getElementById('survival_voltage').value);
            const vV = validateFields([{ name: 'Напруга (V)', value: voltage, positive: true }]);
            if (!vV.ok) return alert(vV.message);
        }
    } else {
        unit = document.getElementById('survival_know_capacity').value;
    }
    
    const capacityWh = getCapacityWh({ type, unit, value, voltage });
    const p = Number(document.getElementById('survival_p').value);
    const hours = Number(document.getElementById('survival_hours_needed').value);

    const v = validateFields([
        { name: 'Ємність', value: capacityWh, positive: true },
        { name: 'Поточний % заряду', value: p, min: 0, max: 100 },
        { name: 'Кількість годин', value: hours, positive: true }
    ]);
    if (!v.ok) return alert(v.message);
    
    const { availableWh } = calculateSurvivalMaxPower(capacityWh, p, hours, type);
    
    // 🟢 Враховуємо сонячний приплив енергії (якщо передано з Кнопки 11):
    const solarBonusWh = Number(document.getElementById('survival_solar_wh')?.value) || 0;
    const totalEnergyWh = availableWh + solarBonusWh;
    const maxW = hours > 0 ? (totalEnergyWh / hours) : 0;

    const res = document.getElementById('survivalModeResult');
    
    // Перевірка на критичний розряд акумулятора
    // Якщо заряд критичний:
    if (availableWh <= 0 && p > 0 && solarBonusWh <= 0) {
        showResultWithShare('survivalModeResult', `
            <b>🛡️ План виживання (${chem(type).label}):</b><br><br>
            <div style="background: rgba(255, 68, 68, 0.1); border-left: 3px solid #ff4444; padding: 10px; border-radius: 6px; text-align: left;">
                <b style="color: #ff4444; font-size: 1.05em;">⚠️ Акумулятор уже розряджений нижче безпечного рівня DoD (${(chem(type).dod * 100).toFixed(0)}%)!</b><br><br>
                <span style="font-size: 12.5px; line-height: 1.4; display: block;">
                    Поточний заряд (<b>${p}%</b>) критичний. Терміново підключіть зарядку.
                </span>
            </div>
        `);
        return;
    }

    const targetSurvival = getTargetTimeText(hours * 60, 'discharge');

    showResultWithShare('survivalModeResult', `
        <b>🛡️ План виживання (${chem(type).label}):</b><br>
        План на: <b>${hours} год.</b> <span style="color:#ff9900; font-weight:bold;">${targetSurvival}</span><br>
        Доступно енергії: <b>${totalEnergyWh.toFixed(1)} Wh</b> ${solarBonusWh > 0 ? `<small style="color:#ff9900;">(АКБ: ${availableWh.toFixed(1)} Wh + Сонце: ${solarBonusWh} Wh)</small>` : ''}<br>
        Максимальне навантаження: <b style="color:#ff9900; font-size:1.15em;">${formatWattsWithError(maxW)}</b><br><br>
        Щоб вистачило <b>${targetSurvival}</b>, не перевищуйте середнє споживання <b>${maxW.toFixed(1)} W</b>.<br>
        <span style="color:#888; font-size:11px;">Враховано захисний поріг DoD: ${(chem(type).dod*100).toFixed(0)}% та ККД: ${(chem(type).effDischarge*100).toFixed(0)}%.</span>
    `);
}

// ============================================================================
// 9. КНОПКА 8 – АУДИТ ПБ (ПЕРЕВІРКА РЕАЛЬНОЇ ЯКОСТІ)
// ============================================================================
// Перемикання способу введення часу для аудиту
function toggleAuditTimeMode() {
    const mode = document.getElementById('audit_time_mode')?.value || 'duration';
    const durBox = document.getElementById('audit_duration_fields');
    const rangeBox = document.getElementById('audit_range_fields');
    if (durBox) durBox.style.display = (mode === 'duration') ? 'block' : 'none';
    if (rangeBox) rangeBox.style.display = (mode === 'range') ? 'block' : 'none';
}
function openAuditPowerbankForm() {
    document.getElementById('audit_battery_type').value = 'lithium';
    document.getElementById('audit_capacity_value').value = '';
    // 🟢 Скидання полів часу
    if (document.getElementById('audit_time_mode')) document.getElementById('audit_time_mode').value = 'duration';
    if (document.getElementById('audit_dur_h')) document.getElementById('audit_dur_h').value = '';
    if (document.getElementById('audit_dur_m')) document.getElementById('audit_dur_m').value = '';
    if (document.getElementById('audit_time_start')) document.getElementById('audit_time_start').value = '';
    if (document.getElementById('audit_time_end')) document.getElementById('audit_time_end').value = '';
    toggleAuditTimeMode();
    document.getElementById('audit_watts').value = '';
    // ✅ Стало:
if (document.getElementById('audit_p1')) document.getElementById('audit_p1').value = '100';
if (document.getElementById('audit_p2')) document.getElementById('audit_p2').value = '';
    document.getElementById('audit_lead_unit').value = 'wh';
    document.getElementById('audit_know_capacity').value = 'mah';
    
    // 🟢 Скидаємо режим навантаження на старт:
    if (document.getElementById('audit_load_mode')) {
        document.getElementById('audit_load_mode').value = 'constant';
        toggleAuditLoadMode();
    }

    toggleAuditCapacityFields();

    ArsenalV3.ensureContainer('auditPowerbankModal', 'arsenal_single_8');
    ArsenalV3.renderSingle('arsenal_single_8', 'SOURCE', 'btn8_audit');
    openModal('auditPowerbankModal');
}

function toggleAuditCapacityFields() {
    const type = document.getElementById('audit_battery_type').value;
    const label = document.getElementById('audit_capacity_label');
    const input = document.getElementById('audit_capacity_value');
    const leadUnitSelect = document.getElementById('audit_lead_unit');
    const voltageField = document.getElementById('audit_voltage_field');
    const knowCapGroup = document.getElementById('audit_know_capacity_group');
    const knowCap = document.getElementById('audit_know_capacity').value;
    
    leadUnitSelect.style.display = 'none';
    voltageField.style.display = 'none';
    knowCapGroup.style.display = 'none';
    
    if (type === 'lifepo4') {
        label.textContent = 'Ємність у Wh:';
        input.placeholder = 'Наприклад: 37';
    } else if (type === 'lead_acid') {
        label.textContent = 'Ємність:';
        input.placeholder = 'Введіть значення';
        leadUnitSelect.style.display = 'block';
        toggleAuditVoltageField();
    } else {
        knowCapGroup.style.display = 'block';
        const vNom = chem(type).vNom;
        if (knowCap === 'wh') {
            label.textContent = `Ємність ${chem(type).label} (Wh):`;
            input.placeholder = 'Наприклад: 38';
        } else {
            label.textContent = `Ємність ${chem(type).label} (mAh) [${vNom}V]:`;
            input.placeholder = 'Наприклад: 10000';
        }
    }
}

function toggleAuditVoltageField() {
    const leadUnit = document.getElementById('audit_lead_unit').value;
    document.getElementById('audit_voltage_field').style.display = (leadUnit === 'ah') ? 'block' : 'none';
}


function toggleAuditLoadMode() {
    const mode = document.getElementById('audit_load_mode').value;
    const phoneBox = document.getElementById('audit_phone_preset_box');
    const wattsLabel = document.getElementById('audit_watts_label');
    const wattsHint = document.getElementById('audit_watts_hint');
    const wattsInput = document.getElementById('audit_watts');
    const constantHint = document.getElementById('audit_constant_hint'); // 🟢 1. Отримуємо елемент підказки

    if (mode === 'phone') {
        phoneBox.style.display = 'block';
        if (constantHint) constantHint.style.display = 'none'; // 🔴 2. Ховаємо підказку для постійного навантаження
        if (wattsLabel) wattsLabel.textContent = 'Середня розрахункова потужність (W):';
        if (wattsHint) wattsHint.textContent = 'Встановлено чесну середню потужність з урахуванням спаду струму смартфона.';
        applyAuditPhonePreset();
    } else {
        phoneBox.style.display = 'none';
        if (constantHint) constantHint.style.display = 'block'; // 🟢 3. Показуємо підказку для постійного навантаження
        if (wattsLabel) wattsLabel.textContent = 'Потужність навантаження (W):';
        if (wattsHint) wattsHint.textContent = 'Для роутера вказуйте стабільні 5–6 W.';
        if (wattsInput) {
            wattsInput.value = '';
            wattsInput.placeholder = 'Наприклад: 5';
        }
    }
}



function applyAuditPhonePreset() {
    const presetSelect = document.getElementById('audit_phone_preset');
    if (presetSelect) {
        document.getElementById('audit_watts').value = presetSelect.value;
    }
}


// 🟢 Відкриття редагування пристрою з аудиту з автопідстановкою реальної ємності
function updateAuditedDevice(deviceId, realWh, realMah) {
    if (!deviceId) return;

    // 1. Закриваємо модалку аудиту
    closeModal('auditPowerbankModal');

    // 2. Відкриваємо форму редагування цього пристрою в Арсеналі
    editDeviceV3(deviceId);

    // 3. Автоматично підставляємо виміряну реальну ємність і підсвічуємо поле зеленим
    const capType = document.getElementById('source_cap_type')?.value;
    const capInput = document.getElementById('source_cap_value');
    if (capInput) {
        capInput.value = (capType === 'wh') ? realWh.toFixed(1) : Math.round(realMah);
        capInput.style.borderColor = '#4CAF50';
    }
}

function auditPowerbank() {
    const type = document.getElementById('audit_battery_type').value;
    const value = Number(document.getElementById('audit_capacity_value').value);
    
    let unit = 'mah';
    let voltage = null;
    
    if (type === 'lifepo4') {
        unit = 'wh';
    } else if (type === 'lead_acid') {
        unit = document.getElementById('audit_lead_unit').value;
        if (unit === 'ah') {
            voltage = Number(document.getElementById('audit_voltage').value);
            const vV = validateFields([{ name: 'Напруга (V)', value: voltage, positive: true }]);
            if (!vV.ok) return alert(vV.message);
        }
    } else {
        unit = document.getElementById('audit_know_capacity').value;
    }
    
    const nominalWh = getCapacityWh({ type, unit, value, voltage });

    // 🟢 РОЗРАХУНОК ГОДИН (з тривалості або з проміжку):
    const timeMode = document.getElementById('audit_time_mode')?.value || 'duration';
    let hours = 0;

    if (timeMode === 'duration') {
        const h = Number(document.getElementById('audit_dur_h')?.value) || 0;
        const m = Number(document.getElementById('audit_dur_m')?.value) || 0;
        hours = h + (m / 60);
        if (hours <= 0) return alert('⚠️ Вкажіть тривалість роботи (години або хвилини)!');
    } else {
        const tStart = document.getElementById('audit_time_start')?.value;
        const tEnd = document.getElementById('audit_time_end')?.value;
        if (!tStart || !tEnd) return alert('⚠️ Вкажіть час початку та час закінчення тесту!');
        
        const [h1, m1] = tStart.split(':').map(Number);
        const [h2, m2] = tEnd.split(':').map(Number);
        
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) {
            diffMinutes += 24 * 60;
        }
        if (diffMinutes === 0) {
            return alert('⚠️ Час початку і кінця не можуть бути однаковими!');
        }
        hours = diffMinutes / 60;
    }

    const watts = Number(document.getElementById('audit_watts').value);

    // Зчитуємо початковий і кінцевий % та вираховуємо дельту:
    const p1 = Number(document.getElementById('audit_p1').value);
    const p2 = Number(document.getElementById('audit_p2').value);

    const vP = validateFields([
        { name: '% на початку тесту', value: p1, min: 1, max: 100 },
        { name: '% в кінці тесту', value: p2, min: 0, max: 100 }
    ]);
    if (!vP.ok) return alert(vP.message);

    const percentUsed = Math.abs(p1 - p2);
    if (percentUsed === 0) {
        return alert('⚠️ Відсотки на початку та в кінці однакові! Має бути різниця в заряді для розрахунку.');
    }

    const v = validateFields([
        { name: 'Ємність', value: nominalWh, positive: true },
        { name: 'Потужність споживача (W)', value: watts, positive: true }
    ]);
    if (!v.ok) return alert(v.message);
    
    const realWh = watts * hours;
    const efficiency = calculateAuditEfficiency(nominalWh, percentUsed, realWh);
    const realCapacityWh = calculateRealCapacity(realWh, percentUsed);
    const realCapacityMah = calculateRealCapacityMah(realCapacityWh, type);
    const estCycles = estimateCycles(type);

    // 🟢 Теорія похибок для аудиту (Error Propagation):
    const uncRealWh  = getRealWhUncertainty(realWh);
    const uncCap     = getRealCapacityUncertainty(realWh, percentUsed, realCapacityWh);
    const uncEff     = getEfficiencyUncertainty(realWh, nominalWh, percentUsed, efficiency);

    // Витягуємо абсолютні похибки для форматування через withUnc:
    const uncRealWhAbs = (typeof uncRealWh === 'object' && uncRealWh !== null)
        ? (uncRealWh.abs ?? (uncRealWh.rel ? uncRealWh.rel * realWh : 0))
        : (Number(uncRealWh) || 0);

    const uncCapAbs = (typeof uncCap === 'object' && uncCap !== null)
        ? (uncCap.abs ?? (uncCap.rel ? uncCap.rel * realCapacityWh : 0))
        : (Number(uncCap) || 0);

    const uncEffAbs = (typeof uncEff === 'object' && uncEff !== null)
        ? (uncEff.abs ?? (uncEff.rel ? uncEff.rel * efficiency : 0))
        : (Number(uncEff) || 0);

    const uncMahAbs = (uncCap && uncCap.rel) ? (uncCap.rel * realCapacityMah) : 0;

    const { icon: qualityIcon, text: qualityStatus } = getQualityStatus(efficiency);
    const res = document.getElementById('auditPowerbankResult');

    const statusColor = (efficiency > 105) ? '#ff4444'
        : (efficiency >= 85 ? '#4CAF50' : (efficiency >= 70 ? '#ff9900' : '#ff4444'));

// 🟢 Розумна підказка: генерується, але показується лише при увімкненому показі похибок
    const relPercent = Math.round(uncEff.rel * 100);

    const uncertaintyHint = (uncEff.rel > 0.12 && efficiency <= 105)
        ? `<div style="background: rgba(255,153,0,0.12); border-left: 3px solid #ff9900; padding: 8px 10px; border-radius: 6px; margin-top: 10px; font-size: 11.5px; color: #ffb74d; line-height: 1.45;">
            💡 <b>Широкий діапазон довіри (відносна похибка ±${relPercent}%).</b>
            Ви розрядили ПБ лише на <b>${percentUsed}%</b>. Щоб звузити похибку до ±10%,
            розрядіть ПБ глибше — мінімум на <b>40–50%</b> (ідеально — до 0%).
        </div>`
        : (efficiency <= 105
            ? `<div style="background: rgba(76,175,80,0.10); border-left: 3px solid #4CAF50; padding: 8px 10px; border-radius: 6px; margin-top: 10px; font-size: 11.5px; color: #81c784; line-height: 1.45;">
                ✅ <b>Точний тест (відносна похибка ±${relPercent}%).</b>
                Ви розрядили ПБ на ${percentUsed}% — цього достатньо для надійної оцінки.
            </div>`
            : '');

// 🟢 Форматування ККД з урахуванням процентних пунктів (п.п.):
    const effDisplay = window.SHOW_UNCERTAINTY
        ? `${efficiency.toFixed(1)}% <span style="color:#ff9900;">± ${uncEffAbs.toFixed(1)} п.п.</span>`
        : `${efficiency.toFixed(1)}%`;


        


// 🟢 Перевіряємо, чи був обраний девайс з Арсеналу:
    const arsenalSelect = document.getElementById('arsenal_single_8_select');
    const selectedDeviceId = arsenalSelect ? arsenalSelect.value : '';

    let updateBtnHtml = '';
    if (selectedDeviceId) {
        updateBtnHtml = `
            <button type="button" class="btn-update-device" onclick="updateAuditedDevice('${selectedDeviceId}', ${realCapacityWh}, ${realCapacityMah})" 
                    style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255, 153, 0, 0.12); border: 1px solid #ff9900; color: #ffb74d; padding: 4px 10px; border-radius: 14px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                🔄 Оновити дані про девайс?
            </button>
        `;
    }

    // Виводимо результат разом із кнопкою оновлення:
    showResultWithShare('auditPowerbankResult', `
        <b>📊 Результат аудиту (${chem(type).label}):</b><br>
        Оцінка якості: <b>${qualityIcon} <span style="color: ${statusColor};">${qualityStatus}</span></b><br>
        Реальний ККД: <b style="color: ${statusColor}; font-size: 1.2em;">${effDisplay}</b><br>
        Реальна ємність: <b>${withUnc(realCapacityWh, uncCapAbs, 'Wh', 1)}</b> <b style="color: #000; font-size: 12px;">(${withUnc(realCapacityMah, uncMahAbs, 'mAh', 0)})</b><br>
        Номінальна ємність: <b>${nominalWh.toFixed(1)} Wh</b><br>
        Віддана енергія в тесті: <b>${withUnc(realWh, uncRealWhAbs, 'Wh', 1)}</b> (витрачено <b>${percentUsed}%</b> за ${formatTime(hours * 60)})<br>
        <span style="color: #888; font-size: 11.5px;">
            Орієнтовний ресурс: <b>≈${estCycles} циклів</b> | Середнє навантаження: <b>${watts} W</b>
        </span>
        ${window.SHOW_UNCERTAINTY ? uncertaintyHint : ''}
    `, updateBtnHtml);
}

// ============================================================================
// 10. КНОПКА 9 – HOME BACKUP (КВАРТИРА/ДБЖ)
// ============================================================================
function openCalcHomeBackupForm() {
    document.getElementById('backup_type').value = 'lifepo4';
    document.getElementById('backup_know_wh').value = 'yes';
    document.getElementById('backup_wh').value = '';
    document.getElementById('backup_ah').value = '';
    document.getElementById('backup_mah').value = '';
    document.getElementById('backup_voltage').value = '12';
    if (document.getElementById('backup_percent')) document.getElementById('backup_percent').value = '100'; // 🟢 скидання на 100%
    document.getElementById('backup_count').value = '';
    document.getElementById('backup_consumers_container').innerHTML = '';
    toggleBackupWhFields();

    ArsenalV3.ensureContainer('calcHomeBackupModal', 'arsenal_single_9_battery');
    ArsenalV3.ensureContainer('calcHomeBackupModal', 'arsenal_multi_9', '#backup_consumers_container');
    ArsenalV3.renderSingle('arsenal_single_9_battery', 'SOURCE', 'btn9_battery');
    ArsenalV3.renderMulti('arsenal_multi_9', 'LOAD', 'btn9_backup');
    openModal('calcHomeBackupModal');
}

function toggleBackupWhFields() {
    const know = document.getElementById('backup_know_wh').value;
    const type = document.getElementById('backup_type').value;
    document.getElementById('backup_wh_field').style.display = (know === 'yes' ? 'block' : 'none');
    document.getElementById('backup_ah_field').style.display = (know === 'no_ah' ? 'block' : 'none');
    document.getElementById('backup_mah_field').style.display = (know === 'no_mah' ? 'block' : 'none');
    document.getElementById('backup_voltage_field').style.display = (know === 'no_ah' && type !== 'lifepo4' ? 'block' : 'none');
    updateBackupConsumerFields();
}

function updateBackupConsumerFields() {
    const count = Number(document.getElementById('backup_count').value) || 0;
    const container = document.getElementById('backup_consumers_container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label>№${i}: W чи V&A?</label>
            <select id="backup_consumer_${i}_know" onchange="toggleBackupConsumerFields(${i})">
                <option value="w">W</option>
                <option value="va">V & A</option>
            </select>
            <div id="backup_consumer_${i}_w_field">
                <label>W:</label><input type="number" id="backup_consumer_${i}_w">
            </div>
            <div id="backup_consumer_${i}_va_fields" style="display: none;">
                <label>V:</label><input type="number" id="backup_consumer_${i}_v">
                <label>A:</label><input type="number" id="backup_consumer_${i}_a">
            </div>
        `;
        container.appendChild(div);
    }
}

function toggleBackupConsumerFields(index) {
    const know = document.getElementById(`backup_consumer_${index}_know`).value;
    document.getElementById(`backup_consumer_${index}_w_field`).style.display = (know === 'w' ? 'block' : 'none');
    document.getElementById(`backup_consumer_${index}_va_fields`).style.display = (know === 'va' ? 'block' : 'none');
}

function calcHomeBackup() {
    const type = document.getElementById('backup_type').value;
    const know = document.getElementById('backup_know_wh').value;
    
    let unit = 'wh';
    let value = 0;
    let voltage = null;
    
    if (know === 'yes') {
        unit = 'wh';
        value = Number(document.getElementById('backup_wh').value);
    } else if (know === 'no_ah') {
        unit = 'ah';
        value = Number(document.getElementById('backup_ah').value);
        voltage = Number(document.getElementById('backup_voltage').value);
        const vV = validateFields([{ name: 'Напруга (V)', value: voltage, positive: true }]);
        if (!vV.ok) return alert(vV.message);
    } else if (know === 'no_mah') {
        unit = 'mah';
        value = Number(document.getElementById('backup_mah').value);
    }
    
    const capacityWh = getCapacityWh({ type, unit, value, voltage });
    const vCap = validateFields([{ name: 'Ємність батареї', value: capacityWh, positive: true }]);
    if (!vCap.ok) return alert(vCap.message);

    // 🟢 Зчитуємо поточний % заряду:
    const currentPercent = Number(document.getElementById('backup_percent')?.value) || 100;
    const vP = validateFields([{ name: 'Поточний % заряду', value: currentPercent, min: 0, max: 100 }]);
    if (!vP.ok) return alert(vP.message);
    
    const count = Number(document.getElementById('backup_count').value) || 0;
    const vCount = validateFields([{ name: 'Кількість типів споживачів', value: count, min: 1 }]);
    if (!vCount.ok) return alert(vCount.message);

    let totalW = 0;
    for (let i = 1; i <= count; i++) {
        const knowType = document.getElementById(`backup_consumer_${i}_know`).value;
        if (knowType === 'w') {
            const w = Number(document.getElementById(`backup_consumer_${i}_w`).value) || 0;
            const vC = validateFields([{ name: `Споживач №${i} (W)`, value: w, positive: true }]);
            if (!vC.ok) return alert(vC.message);
            totalW += w;
        } else {
            const v = Number(document.getElementById(`backup_consumer_${i}_v`).value) || 0;
            const a = Number(document.getElementById(`backup_consumer_${i}_a`).value) || 0;
            const vC = validateFields([
                { name: `Споживач №${i} (V)`, value: v, positive: true },
                { name: `Споживач №${i} (A)`, value: a, positive: true }
            ]);
            if (!vC.ok) return alert(vC.message);
            totalW += v * a;
        }
    }
    
    const efficiency = getSystemEfficiency(type);
    // 🟢 Передаємо currentPercent у функцію:
    const { usableWh, hours, isCritical, minPercent } = calculateHomeBackupTime(capacityWh, totalW, type, currentPercent);
    
    const res = document.getElementById('calcHomeBackupResult');

    // 🔴 Попередження, якщо акумулятор уже розряджений нижче безпечного рівня:
    // Якщо заряд критичний:
    if (isCritical) {
        showResultWithShare('calcHomeBackupResult', `
            <b>🏠 Home Backup (${type === 'lead_acid' ? 'Свинцевий АКБ' : 'LiFePO4'}):</b><br><br>
            <div style="background: rgba(255, 68, 68, 0.12); border-left: 3px solid #ff4444; padding: 10px; border-radius: 6px; text-align: left;">
                <b style="color: #ff4444;">⚠️ Акумулятор уже розряджений нижче безпечного рівня (${minPercent}%)!</b><br><br>
                <span style="font-size: 12px; line-height: 1.4; display: block;">
                    Поточний заряд (<b>${currentPercent}%</b>) критичний. ${type === 'lead_acid' ? 'Розряд свинцевого АКБ нижче 50% спричинить незворотну сульфатацію та виведе його з ладу!' : 'Батарея майже повністю виснажена.'} Терміново підключіть зарядку.
                </span>
            </div>
        `);
        return;
    }

    const totalMins = Math.round(hours * 60);
    const dod = (type === 'lifepo4') ? '80-90%' : '50%';
    
    showResultWithShare('calcHomeBackupResult', `
        <b>🏠 Home Backup Розрахунок:</b><br>
        Повна ємність: <b>${capacityWh.toFixed(1)} Wh</b><br>
        Корисна ємність: <b>${usableWh.toFixed(1)} Wh</b> (ККД ${(efficiency*100).toFixed(0)}%)<br>
        Сумарне навантаження: <b>${totalW.toFixed(1)} W</b><br>
        <br>
        <b>⏱️ Час роботи: <span style="color:#4CAF50; font-size:1.2em;">${formatTimeWithError(totalMins)}</span> <span style="color:#ff9900; font-weight:bold; font-size:0.9em;">${getTargetTimeText(totalMins, 'discharge')}</span></b><br>
        Рекомендований DoD: ${dod}<br>
        ${type === 'lead_acid' ? '⚠️ Свинцевий АКБ не можна розряджати нижче 50%' : '✅ LiFePO4 безпечно розряджається до 85-90%'}
    `);
}


// ============================================================================
// 11. КНОПКА 10 – РЕГЕНЕРАЦІЯ
// ============================================================================
function openCalcRechargeForm() {
    document.getElementById('recharge_type').value = 'lifepo4';
    document.getElementById('recharge_know_capacity').value = 'wh';
    document.getElementById('recharge_wh').value = '';
    document.getElementById('recharge_ah').value = '';
    document.getElementById('recharge_mah').value = '';
    document.getElementById('recharge_voltage').value = '12';
    document.getElementById('recharge_current_perc').value = '';
    document.getElementById('recharge_power').value = '';
    toggleRechargeCapacityFields();

    ArsenalV3.ensureContainer('calcRechargeModal', 'arsenal_single_10');
    ArsenalV3.renderSingle('arsenal_single_10', 'SOURCE', 'btn10_recharge');
    openModal('calcRechargeModal');
}

function toggleRechargeCapacityFields() {
    const know = document.getElementById('recharge_know_capacity').value;
    const type = document.getElementById('recharge_type').value;
    document.getElementById('recharge_wh_field').style.display = (know === 'wh') ? 'block' : 'none';
    document.getElementById('recharge_ah_field').style.display = (know === 'ah') ? 'block' : 'none';
    document.getElementById('recharge_mah_field').style.display = (know === 'mah') ? 'block' : 'none';
    document.getElementById('recharge_voltage_field').style.display = (know === 'ah' && type !== 'lifepo4' ? 'block' : 'none');
}

function calcRecharge() {
    const type = document.getElementById('recharge_type').value;
    const knowCap = document.getElementById('recharge_know_capacity').value;
    
    let unit = knowCap;
    let value = 0;
    let voltage = null;
    
    if (knowCap === 'wh') {
        value = Number(document.getElementById('recharge_wh').value);
    } else if (knowCap === 'ah') {
        value = Number(document.getElementById('recharge_ah').value);
        voltage = Number(document.getElementById('recharge_voltage').value);
        if (!voltage) voltage = (type === 'lifepo4') ? 12.8 : chem(type).vNom;
    } else if (knowCap === 'mah') {
        value = Number(document.getElementById('recharge_mah').value);
    }
    
    const capacityWh = getCapacityWh({ type, unit, value, voltage });
    const currentPerc = Number(document.getElementById('recharge_current_perc').value);
    const chargePower = Number(document.getElementById('recharge_power').value);

    const v = validateFields([
        { name: 'Ємність батареї', value: capacityWh, positive: true },
        { name: 'Поточний % заряду', value: currentPerc, min: 0, max: 100 },
        { name: 'Потужність зарядного пристрою (W)', value: chargePower, positive: true }
    ]);
    if (!v.ok) return alert(v.message);
    
    const res = document.getElementById('calcRechargeResult');
    if (currentPerc === 100) {
        showResultWithShare('calcRechargeResult', '<b style="color:#4CAF50;">✅ Акумулятор уже повністю заряджений (100%)!</b>');
        return;
    }

    const { neededWh, effectivePower, hours } = calculateRechargeTime(capacityWh, currentPerc, chargePower, type);
    const efficiency = getChargeEfficiency(type);
    const totalMins = Math.round(hours * 60);

    showResultWithShare('calcRechargeResult', `
        <b>🔌 Регенерація (${chem(type).label}):</b><br>
        Потрібно увібрати: <b>${neededWh.toFixed(1)} Wh</b> (${currentPerc}% → 100%)<br>
        Засвоєна потужність: <b>${effectivePower.toFixed(1)} W</b> (ККД ${(efficiency*100).toFixed(0)}%)<br>
        <br>
        <b>⏱ Орієнтовний час зарядки:</b><br>
        <span style="font-size: 1.3em; color: #4CAF50;"><b>${formatTimeWithError(totalMins)}</b></span> <span style="color:#64b5f6; font-weight:bold; font-size:0.9em;">${getTargetTimeText(totalMins, 'charge')}</span>
        ${type === 'lead_acid' ? '<br><span style="color:#ff9900; font-size:11px;">⚠️ Свинцеві АКБ після 80% заряджаються значно повільніше через фазу абсорбції.</span>' : ''}
    `);
}

// ============================================================================
// 12. КНОПКА 11 – СОНЯЧНІ ПАНЕЛІ (SOLAR HYBRID)
// ============================================================================
const SolarHybrid = {
    config: {
        CACHE_TTL_DAYS: 7,
        API_TIMEOUT_MS: 5000,
        SYSTEM_EFFICIENCY: EFFICIENCY.SOLAR_SYSTEM
    },
    cache: {
        get: function(lat, lon) {
            try {
                const key = `solar_${lat.toFixed(2)}_${lon.toFixed(2)}`;
                const cached = localStorage.getItem(key);
                if (!cached) return null;
                const data = JSON.parse(cached);
                const ttl = SolarHybrid.config.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
                if (Date.now() - data.timestamp < ttl) return data.profile;
                localStorage.removeItem(key);
                return null;
            } catch (e) { return null; }
        },
        set: function(lat, lon, profile) {
            try {
                const key = `solar_${lat.toFixed(2)}_${lon.toFixed(2)}`;
                localStorage.setItem(key, JSON.stringify({ lat, lon, timestamp: Date.now(), profile }));
            } catch (e) {}
        }
    },
    api: {
        endpoint: 'https://re.jrc.ec.europa.eu/api/v5_2/profile',
        fetch: async function(lat, lon, tilt, azimuth, totalPowerKw) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), SolarHybrid.config.API_TIMEOUT_MS);
            try {
                const url = `${this.endpoint}?lat=${lat}&lon=${lon}&outputformat=json&peakpower=1&system_loss=0&angle=${tilt}&aspect=${azimuth}`;
                const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
                clearTimeout(timeout);
                if (!response.ok) throw new Error(`API error: ${response.status}`);
                const data = await response.json();
                if (!data.outputs?.hourly) throw new Error('Invalid API response');
                return data.outputs.hourly.map(val => val * totalPowerKw * SolarHybrid.config.SYSTEM_EFFICIENCY);
            } catch (e) { return null; }
        }
    },
    local: {
        calculateProfile: function(inputs) {
            const { lat, tilt, azimuth, date, totalPowerKw } = inputs;
            return calculateSolarOfflineProfile({ lat, tilt, azimuth, date, totalPowerKw });
        }
    },
    calculate: async function(inputs) {
        const { lat, lon, tilt, azimuth, date, time, totalPowerKw, dataMode } = inputs;
        let profile = null;
        let source = '';
        
        if (dataMode !== 'api') {
            profile = this.cache.get(lat, lon);
            if (profile) source = 'CACHE';
        }
        
        if (!profile && dataMode !== 'offline' && navigator.onLine) {
            this.updateStatus('🟡', 'Запит до PVGIS API...', 'api-loading');
            profile = await this.api.fetch(lat, lon, tilt, azimuth, totalPowerKw);
            if (profile) {
                this.cache.set(lat, lon, profile);
                source = 'API';
            }
        }
        
        if (!profile) {
            profile = this.local.calculateProfile({ lat, tilt, azimuth, date, totalPowerKw });
            source = 'OFFLINE';
        }
        
        const currentHour = new Date(`${date}T${time}`).getHours();
        const instantPower = profile[currentHour] || 0;
        const dailyEnergy = profile.reduce((sum, val) => sum + val, 0);
        
        let status = '';
        if (instantPower === 0) status = currentHour >= 6 && currentHour <= 20 ? '☁️ Хмарно / Ніч' : '🌙 Ніч';
        else if (instantPower < totalPowerKw * 1000 * 0.3) status = '🌤️ Слабке сонце';
        else status = '☀️ Заряджає АКБ';
        
        return { instantPower: Math.round(instantPower), dailyEnergy: Math.round(dailyEnergy), status, source, profile, currentHour };
    },
    updateStatus: function(icon, text, type) {
        const statusDiv = document.getElementById('solar_status');
        const iconSpan = document.getElementById('status_icon');
        const textSpan = document.getElementById('status_text');
        if (!statusDiv) return;
        statusDiv.style.display = 'block';
        iconSpan.textContent = icon;
        textSpan.textContent = text;
        const colors = { 'api': '#4CAF50', 'cache': '#FF9800', 'offline': '#2196F3', 'error': '#F44336', 'api-loading': '#9E9E9E' };
        iconSpan.style.color = colors[type] || '#fff';
    }
};

function openSolarCalculator() {
    const now = new Date();
    document.getElementById('solar_date').value = now.toISOString().split('T')[0];
    document.getElementById('solar_time').value = now.toTimeString().slice(0, 5);
    const lat = parseFloat(document.getElementById('solar_lat').value) || 49;
    document.getElementById('solar_tilt').value = lat;
    document.getElementById('solar_results').style.display = 'none';
    document.getElementById('solar_status').style.display = 'none';
    openModal('solarModal');
}

async function detectLocation() {
    if (!navigator.geolocation) return alert('📍 Геолокація не підтримується');
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '🎯 Визначення...';
    btn.disabled = true;
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 3600000 });
        });
        document.getElementById('solar_lat').value = position.coords.latitude.toFixed(4);
        document.getElementById('solar_lon').value = position.coords.longitude.toFixed(4);
        document.getElementById('solar_tilt').value = position.coords.latitude.toFixed(1);
        SolarHybrid.updateStatus('🟢', `Локація: ${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`, 'api');
    } catch (e) {
        alert('❌ Не вдалося визначити локацію: ' + e.message);
        SolarHybrid.updateStatus('🔴', 'Помилка геолокації', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function calculateSolar() {
    const inputs = {
        panelsCount: parseInt(document.getElementById('solar_panels_count').value) || 0,
        panelPower: parseInt(document.getElementById('solar_panel_power').value) || 0,
        lat: parseFloat(document.getElementById('solar_lat').value),
        lon: parseFloat(document.getElementById('solar_lon').value),
        date: document.getElementById('solar_date').value,
        time: document.getElementById('solar_time').value,
        tilt: parseFloat(document.getElementById('solar_tilt').value),
        azimuth: parseFloat(document.getElementById('solar_azimuth').value),
        dataMode: document.getElementById('solar_data_mode').value
    };

    if (!inputs.date) return alert('Оберіть дату');
    if (!inputs.time) return alert('Вкажіть час');

    inputs.totalPowerKw = (inputs.panelsCount * inputs.panelPower) / 1000;
    document.getElementById('solar_loader').style.display = 'block';
    document.getElementById('solar_results').style.display = 'none';
    document.getElementById('solar_calc_btn').disabled = true;
    
    try {
        const result = await SolarHybrid.calculate(inputs);
        displaySolarResults(result, inputs);  
        // Оновлюємо бейдж передачі
    updateSolarExportPreview();
    } catch (e) {
        SolarHybrid.updateStatus('🔴', 'Помилка розрахунку', 'error');
        alert('❌ Помилка: ' + e.message);
    } finally {
        document.getElementById('solar_loader').style.display = 'none';
        document.getElementById('solar_calc_btn').disabled = false;
    }
}

function displaySolarResults(result, inputs) {
    const statusMap = { 'API': ['🟢', 'Онлайн (PVGIS)'], 'CACHE': ['🟠', 'Кеш (PVGIS)'], 'OFFLINE': ['🔵', 'Офлайн (Формули)'] };
    const [icon, text] = statusMap[result.source] || ['⚪', 'Невідомо'];
    SolarHybrid.updateStatus(icon, text, result.source.toLowerCase());
    
    document.getElementById('res_instant_power').textContent = `${result.instantPower} W`;
    document.getElementById('res_daily_energy').textContent = `${result.dailyEnergy} Wh`;
    document.getElementById('res_status_text').textContent = result.status;
    document.getElementById('res_data_source').textContent = {
        'API': 'PVGIS API (живі дані)', 'CACHE': 'PVGIS API (кеш < 7 днів)', 'OFFLINE': 'Локальні астрономічні формули'
    }[result.source];
    
    drawSolarChart(result.profile, result.currentHour);
    document.getElementById('solar_results').style.display = 'block';
    window.solarLastResult = { ...result, ...inputs };
}

function drawSolarChart(profile, currentHour) {
    const canvas = document.getElementById('solar_chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1a1a1d';
    ctx.fillRect(0, 0, width, height);
    
    const maxPower = Math.max(...profile, 1);
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
    }
    
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    profile.forEach((value, hour) => {
        const x = padding + (chartWidth / 23) * hour;
        const y = padding + chartHeight - (value / maxPower) * chartHeight;
        if (hour === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.fill();
    
    const currentX = padding + (chartWidth / 23) * currentHour;
    ctx.strokeStyle = '#ff9900';
    ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(currentX, padding); ctx.lineTo(currentX, padding + chartHeight); ctx.stroke();
    ctx.setLineDash([]);    
    
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    [0, 6, 12, 18, 23].forEach(hour => {
        const x = padding + (chartWidth / 23) * hour;
        ctx.fillText(`${hour}:00`, x, height - 10);
    });
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(padding, 10, 15, 3);
    ctx.fillStyle = '#ccc';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Виробітка (Вт)', padding + 20, 13);
}
// Перемикання вибору: весь день чи проміжок
function toggleSolarExportPeriod() {
    const mode = document.getElementById('solar_export_period_type')?.value || 'full_day';
    const rangeBox = document.getElementById('solar_export_range_box');
    if (rangeBox) rangeBox.style.display = (mode === 'custom_range') ? 'block' : 'none';
    updateSolarExportPreview();
}

// Хелпер розрахунку енергії за обраний період (години)
function getSolarSelectedEnergy() {
    if (!window.solarLastResult || !window.solarLastResult.profile) return null;
    const mode = document.getElementById('solar_export_period_type')?.value || 'full_day';
    const profile = window.solarLastResult.profile;

    if (mode === 'full_day') {
        const totalWh = window.solarLastResult.dailyEnergy;
        return {
            wh: totalWh,
            avgWatts: Math.round(totalWh / 6), // ~6 пікових сонячних годин
            label: 'за весь день'
        };
    }

    const tStart = document.getElementById('solar_export_start')?.value || '11:00';
    const tEnd = document.getElementById('solar_export_end')?.value || '15:00';
    const h1 = parseInt(tStart.split(':')[0], 10);
    const h2 = parseInt(tEnd.split(':')[0], 10);

    if (h2 <= h1) {
        alert('⚠️ Час закінчення має бути пізнішим за час початку!');
        return null;
    }

    // Сумуємо Wh тільки для годин у цьому діапазоні (індекси 0..23 у profile)
    let sumWh = 0;
    for (let h = h1; h < h2; h++) {
        sumWh += (profile[h] || 0);
    }

    const durationHours = h2 - h1;
    const avgWatts = durationHours > 0 ? Math.round(sumWh / durationHours) : 0;

    return {
        wh: Math.round(sumWh),
        avgWatts: avgWatts,
        label: `з ${h1}:00 до ${h2}:00`
    };
}

// Оновлення живого бейджа у вікні сонця
function updateSolarExportPreview() {
    const data = getSolarSelectedEnergy();
    const previewEl = document.getElementById('solar_export_preview');
    if (!previewEl || !data) return;
    previewEl.innerHTML = `⚡ Готово до передачі: <b>${data.wh} Wh</b> (сер. потужність <b>${data.avgWatts} W</b> ${data.label})`;
}
// 🟢 Передача у Кнопку 10 (Регенерація)
function sendToRechargeMode() {
    const data = getSolarSelectedEnergy();
    if (!data) return alert('⚠️ Спочатку розрахуйте генерацію панелей!');

    closeModal('solarModal');
    openCalcRechargeForm();

    // Підставляємо середню потужність за цей період
    const pwrInput = document.getElementById('recharge_power');
    const hint = document.getElementById('recharge_solar_hint');
    if (pwrInput) pwrInput.value = data.avgWatts;
    if (hint) {
        hint.style.display = 'block';
        hint.textContent = `☀️ Встановлено ${data.avgWatts} W (сонце ${data.label}, генерація ${data.wh} Wh).`;
    }
}

// 🟢 Передача у Кнопку 7 (Режим виживання)
function sendToSurvivalMode() {
    const data = getSolarSelectedEnergy();
    if (!data) return alert('⚠️ Спочатку розрахуйте генерацію панелей!');

    closeModal('solarModal');
    openSurvivalModeForm();

    // Підставляємо Wh сонця саме за цей проміжок
    const solarBox = document.getElementById('survival_solar_box');
    const solarInput = document.getElementById('survival_solar_wh');
    if (solarBox) solarBox.style.display = 'block';
    if (solarInput) solarInput.value = data.wh;
}

function handleAzimuthKeydown(event, input) {
    const key = event.key;
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', '-', '−'];
    if ((key === '-' || key === '−') && input.selectionStart === 0) {
        if (!input.value.startsWith('-')) return true;
        event.preventDefault(); return false;
    }
    if ((key === '-' || key === '−') && input.selectionStart !== 0) {
        event.preventDefault(); return false;
    }
    if (!allowedKeys.includes(key) && !/^[0-9]$/.test(key)) {
        event.preventDefault(); return false;
    }
    return true;
}

function validateAzimuth(input) {
    let val = input.value.replace('−', '-').trim();
    val = val.replace(/(?!^)-/g, '').replace(/[^0-9\-]/g, '');
    let num = parseInt(val, 10);
    if (isNaN(num)) { input.value = '0'; return; }
    if (num < -180) num = -180;
    if (num > 180) num = 180;
    input.value = num.toString();
}

// ============================================================================
// 13. КОНВЕРТЕР ВЕЛИЧИН
// ============================================================================
function toggleConverter() {
    const converter = document.getElementById('converter');
    if (!converter) return;
    converter.style.display = converter.style.display === 'block' ? 'none' : 'block';
}

function toggleConverterType() {
    const mainType = document.getElementById('conv_main_type').value;
    document.getElementById('physical_section').style.display = (mainType === 'physical' ? 'block' : 'none');
    document.getElementById('prefix_section').style.display = (mainType === 'prefix' ? 'block' : 'none');
    document.getElementById('physical_result').style.display = 'none';
    document.getElementById('prefix_result').style.display = 'none';
}

const physicalFormulas = {
    'P': [
        { formula: 'P = U × I', needs: ['U', 'I'], desc: 'Потужність через напругу та струм' },
        { formula: 'P = U² / R', needs: ['U', 'R'], desc: 'Потужність через напругу та опір' },
        { formula: 'P = I² × R', needs: ['I', 'R'], desc: 'Потужність через струм та опір' },
        { formula: 'P = A / t', needs: ['A', 't'], desc: 'Потужність через роботу та час' }
    ],
    'I': [
        { formula: 'I = P / U', needs: ['P', 'U'], desc: 'Струм через потужність та напругу' },
        { formula: 'I = U / R', needs: ['U', 'R'], desc: 'Струм через напругу та опір' },
        { formula: 'I = √(P / R)', needs: ['P', 'R'], desc: 'Струм через потужність та опір' }
    ],
    'U': [
        { formula: 'U = P / I', needs: ['P', 'I'], desc: 'Напруга через потужність та струм' },
        { formula: 'U = I × R', needs: ['I', 'R'], desc: 'Напруга через струм та опір' },
        { formula: 'U = √(P × R)', needs: ['P', 'R'], desc: 'Напруга через потужність та опір' }
    ],
    'R': [
        { formula: 'R = U / I', needs: ['U', 'I'], desc: 'Опір через напругу та струм' },
        { formula: 'R = U² / P', needs: ['U', 'P'], desc: 'Опір через напругу та потужність' }
    ],
    'A': [
        { formula: 'A = P × t', needs: ['P', 't'], desc: 'Робота через потужність та час' },
        { formula: 'A = U × I × t', needs: ['U', 'I', 't'], desc: 'Робота через напругу, струм та час' }
    ],
    't': [
        { formula: 't = A / P', needs: ['A', 'P'], desc: 'Час через роботу та потужність' }
    ],    
    'mAh': [{ formula: 'mAh = Ah × 1000', needs: ['Ah'], desc: 'Міліампер-години' }],
    'Ah': [
        { formula: 'Ah = mAh / 1000', needs: ['mAh'], desc: 'Ампер-години' },
        { formula: 'Ah = Wh / V', needs: ['Wh', 'V'], desc: 'Ампер-години через Wh та напругу' }
    ],
    'Wh': [
        { formula: 'Wh = Ah × V', needs: ['Ah', 'V'], desc: 'Ват-години через Ah та напругу' },
        { formula: 'Wh = (mAh × V) / 1000', needs: ['mAh', 'V'], desc: 'Ват-години через mAh та напругу' },
        { formula: 'Wh = P × t', needs: ['P', 't'], desc: 'Ват-години через потужність і час (год)' }
    ]
};

function showPhysicalFormulas() {
    const quantity = document.getElementById('physical_quantity').value;
    const formulasContainer = document.getElementById('formulas_container');
    const formulasList = document.getElementById('formulas_list');
    const inputsContainer = document.getElementById('physical_inputs');
    const resultDiv = document.getElementById('physical_result');
    
    if (!quantity) {
        formulasContainer.style.display = 'none';
        inputsContainer.style.display = 'none';
        resultDiv.style.display = 'none';
        return;
    }
    
    formulasContainer.style.display = 'block';
    const formulas = physicalFormulas[quantity];
    formulasList.innerHTML = formulas.map(f => 
        `<div class="formula-box">📐 ${f.formula}<br><small style="color: #888;">${f.desc}</small></div>`
    ).join('');
    
    const allParams = new Set();
    formulas.forEach(f => f.needs.forEach(p => allParams.add(p)));    
    
    inputsContainer.style.display = 'block';
    inputsContainer.innerHTML = '<label style="color: #ff9900; font-weight: bold; display: block; margin-bottom: 10px;">📝 Введіть відомі величини:</label>';
    
    allParams.forEach(param => {
        inputsContainer.innerHTML += `
            <div class="input-group">
                <label>${param}:</label>
                <input type="number" id="input_${param}" placeholder="Введіть ${param}" step="any">
            </div>
        `;
    });
    resultDiv.style.display = 'none';
}

function calculatePhysical() {
    const quantity = document.getElementById('physical_quantity').value;
    const formulas = physicalFormulas[quantity];
    const resultDiv = document.getElementById('physical_result');
    if (!quantity) return alert('Оберіть величину');
    
    const inputData = {};
    ['P', 'I', 'U', 'R', 'A', 't', 'mAh', 'Ah', 'Wh', 'V'].forEach(param => {
        const val = Number(document.getElementById(`input_${param}`)?.value);
        if (val && val > 0) inputData[param] = val;
    });
    
    let result = null, usedFormula = null;
    for (const f of formulas) {
        if (f.needs.every(param => inputData[param] !== undefined)) {
            usedFormula = f;
            switch (quantity) {
                case 'P':
                    if (f.formula.includes('U × I')) result = inputData.U * inputData.I;
                    else if (f.formula.includes('U² / R')) result = Math.pow(inputData.U, 2) / inputData.R;
                    else if (f.formula.includes('I² × R')) result = Math.pow(inputData.I, 2) * inputData.R;
                    else if (f.formula.includes('A / t')) result = inputData.A / inputData.t;
                    break;
                case 'I':
                    if (f.formula.includes('P / U')) result = inputData.P / inputData.U;
                    else if (f.formula.includes('U / R')) result = inputData.U / inputData.R;
                    else if (f.formula.includes('√(P / R)')) result = Math.sqrt(inputData.P / inputData.R);
                    break;
                case 'U':
                    if (f.formula.includes('P / I')) result = inputData.P / inputData.I;
                    else if (f.formula.includes('I × R')) result = inputData.I * inputData.R;
                    else if (f.formula.includes('√(P × R)')) result = Math.sqrt(inputData.P * inputData.R);
                    break;
                case 'R':
                    if (f.formula.includes('U / I')) result = inputData.U / inputData.I;
                    else if (f.formula.includes('U² / P')) result = Math.pow(inputData.U, 2) / inputData.P;
                    break;
                case 'A':
                    if (f.formula.includes('P × t')) result = inputData.P * inputData.t;
                    else if (f.formula.includes('U × I × t')) result = inputData.U * inputData.I * inputData.t;
                    break;
                case 't':
                    if (f.formula.includes('A / P')) result = inputData.A / inputData.P;
                    break;
                case 'mAh': result = inputData.Ah * 1000; break;
                case 'Ah': result = inputData.mAh ? inputData.mAh / 1000 : inputData.Wh / inputData.V; break;
                case 'Wh': result = inputData.Ah ? inputData.Ah * inputData.V : (inputData.mAh * inputData.V) / 1000; break;
            }
            if (result !== null) break;
        }
    }
    
    if (result === null) {
        resultDiv.innerHTML = `<b style="color: #ff4444;">⚠️ Недостатньо даних!</b><br>Заповніть потрібні поля для розрахунку.`;
        resultDiv.style.display = 'block';
        return;
    }
    
    resultDiv.innerHTML = `
        <div class="result-box">
            <h4>✅ Результат: <b>${result.toFixed(4)}</b></h4>
            <span>Формула: <b>${usedFormula.formula}</b></span>
        </div>
    `;
    resultDiv.style.display = 'block';
}

function calculatePrefix() {
    const value = Number(document.getElementById('prefix_value').value);
    const direction = document.getElementById('prefix_direction').value;
    const unit = document.getElementById('prefix_unit').value;
    const resultDiv = document.getElementById('prefix_result');
    if (!value) return alert('Введіть значення');
    
    let result = 0;
    if (direction === 'milli_to_base') result = value / 1000;
    else if (direction === 'base_to_milli') result = value * 1000;
    else if (direction === 'kilo_to_base') result = value * 1000;
    else if (direction === 'base_to_kilo') result = value / 1000;
    resultDiv.innerHTML = `<div class="result-box">Результат: <b>${result} ${unit}</b></div>`;
    resultDiv.style.display = 'block';
}

function convertMah() {
    const val = (document.getElementById('conv_mah')?.value || '').replace(',', '.');
    const mah = parseFloat(val);
    const res = document.getElementById('res_ah');
    if (!res) return;
    res.innerText = (!isNaN(mah) && mah > 0) ? (mah / 1000).toFixed(3) : '0';
}

function convertWh() {
    const ahVal = (document.getElementById('conv_ah')?.value || '').replace(',', '.');
    const vVal = (document.getElementById('conv_v')?.value || '').replace(',', '.');
    const ah = parseFloat(ahVal);
    const v = parseFloat(vVal);
    const res = document.getElementById('res_wh');
    if (!res) return;
    res.innerText = (!isNaN(ah) && !isNaN(v) && ah > 0 && v > 0) ? (ah * v).toFixed(2) : '0';
}

function convertW() {
    const aVal = (document.getElementById('conv_amp')?.value || '').replace(',', '.');
    const vVal = (document.getElementById('conv_volt')?.value || '').replace(',', '.');
    const amp = parseFloat(aVal);
    const volt = parseFloat(vVal);
    const res = document.getElementById('res_w');
    if (!res) return;
    res.innerText = (!isNaN(amp) && !isNaN(volt) && amp > 0 && volt > 0) ? (amp * volt).toFixed(2) : '0';
}

// ============================================================================
// 14. УТИЛІТИ ТА ВАЛІДАЦІЯ
// ============================================================================
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function formatTime(totalMinutes) {
    if (totalMinutes <= 0 || isNaN(totalMinutes)) return "0 хв.";
    let h = Math.floor(totalMinutes / 60);
    let m = Math.round(totalMinutes % 60);
    return h > 0 ? `${h} год. ${m} хв.` : `${m} хв.`;
}
// Глобальний перемикач показу ±
window.SHOW_UNCERTAINTY = localStorage.getItem('show_uncertainty') !== 'false';

function updateUncertaintyButton() {
    const btn = document.getElementById('unc_toggle_btn');
    if (!btn) return;
    if (window.SHOW_UNCERTAINTY) {
        btn.textContent = '✓ УВІМК';
        btn.style.background = 'rgba(76, 175, 80, 0.15)';
        btn.style.borderColor = '#4CAF50';
        btn.style.color = '#81c784';
    } else {
        btn.textContent = 'ВИКЛ';
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.borderColor = '#555';
        btn.style.color = '#888';
    }
}

function toggleUncertaintyDisplay() {
    window.SHOW_UNCERTAINTY = !window.SHOW_UNCERTAINTY;
    localStorage.setItem('show_uncertainty', window.SHOW_UNCERTAINTY);
    updateUncertaintyButton();
    recalcOpenModals(); // миттєво перерахувати відкритий калькулятор
}

// Перерахувати ті модалки, які зараз відкриті з результатом
function recalcOpenModals() {
    const map = {
        'calcPowerbankModal':  calcPowerbank,
        'calcLiIonModal':      calcLiIon,
        'calcWorkTimeModal':   calcWorkTime,
        'calcLightTimeModal':  calcLightTime,
        'calcFlashlightModal': calcFlashlight,
        'survivalModeModal':   survivalMode,
        'auditPowerbankModal': auditPowerbank,
        'calcHomeBackupModal': calcHomeBackup,
        'calcRechargeModal':   calcRecharge
    };
    for (const [modalId, fn] of Object.entries(map)) {
        const modal = document.getElementById(modalId);
        const result = document.getElementById(modalId.replace('Modal', 'Result'));
        if (modal && modal.style.display === 'block'
            && result && result.style.display === 'block') {
            try { fn(); } catch(e) {}
        }
    }
}

function formatTimeWithError(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0 || isNaN(totalMinutes)) return "0 хв.";
    if (!window.SHOW_UNCERTAINTY) return formatTime(totalMinutes);
    const deltaMin = getUncertaintyMinutes(totalMinutes);
    return `${formatTime(totalMinutes)} <span style="color:#ff9900; font-weight:600;">± ${formatTime(Math.round(deltaMin))}</span>`;
}

function formatWattsWithError(watts) {
    if (!watts || watts <= 0 || isNaN(watts)) return "0 W";
    if (!window.SHOW_UNCERTAINTY) return `${watts.toFixed(1)} W`;
    const deltaW = getUncertaintyWatts(watts);
    return `${watts.toFixed(1)} W <span style="color:#ff9900; font-weight:600;">± ${deltaW.toFixed(1)} W</span>`;
}
// Хелпер: значення ± похибка з урахуванням перемикача
function withUnc(value, deltaAbs, unit = '', decimals = 1) {
    const v = Number(value).toFixed(decimals) + (unit ? ' ' + unit : '');
    if (!window.SHOW_UNCERTAINTY) return v;
    const d = Number(deltaAbs).toFixed(decimals);
    return `${v} <span style="color:#ff9900;">± ${d}${unit ? ' ' + unit : ''}</span>`;
}

// 🟢 Універсальний хелпер точного часу
function getTargetTimeText(totalMinutes, type = 'discharge') {
    if (!totalMinutes || totalMinutes <= 0 || isNaN(totalMinutes)) return '';
    
    const now = new Date();
    // Якщо type === 'past' — віднімаємо час назад (для Кнопки 4)
    const targetMs = (type === 'past') 
        ? now.getTime() - totalMinutes * 60 * 1000 
        : now.getTime() + totalMinutes * 60 * 1000;
        
    const target = new Date(targetMs);
    const h = String(target.getHours()).padStart(2, '0');
    const m = String(target.getMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}`;
    
    const isTomorrow = target.getDate() !== now.getDate();
    
    if (type === 'charge') {
        return isTomorrow ? `(зарядиться завтра о ${timeStr})` : `(зарядиться о ${timeStr})`;
    } else if (type === 'past') {
        return `(якщо дали щойно — зникло о ${timeStr})`;
    } else {
        return isTomorrow ? `(до завтра ${timeStr})` : `(до ${timeStr})`;
    }
}

function validateFields(fields) {
    for (const f of fields) {
        const v = f.value;
        if (f.optional && (v === null || v === undefined || v === '')) continue;
        if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
            return { ok: false, message: `Заповніть поле: ${f.name}` };
        }
        
        // 🟢 Якщо це текстове поле (назва) — не перевіряємо його на числовість!
        if (f.isText) continue;

        if (isNaN(v)) return { ok: false, message: `Заповніть поле: ${f.name}` };
        const num = Number(v);
        if (f.positive && num <= 0) return { ok: false, message: `${f.name} має бути додатнім числом` };
        if (f.min !== undefined && num < f.min) return { ok: false, message: `${f.name} має бути не менше ${f.min}` };
        if (f.max !== undefined && num > f.max) return { ok: false, message: `${f.name} має бути не більше ${f.max}` };
    }
    return { ok: true };
}
function toggleRefTable(type) {
    const lowBox  = document.getElementById('refTableLow');
    const highBox = document.getElementById('refTableHigh');
    const lowBtn  = document.getElementById('refBtnLow');
    const highBtn = document.getElementById('refBtnHigh');
    if (!lowBox || !highBox) return;

    const isOpeningLow  = (type === 'low'  && lowBox.style.display  === 'none');
    const isOpeningHigh = (type === 'high' && highBox.style.display === 'none');

    // Закриваємо обидві таблиці та скидаємо стиль кнопок
    lowBox.style.display  = 'none';
    highBox.style.display = 'none';
    lowBtn.style.background  = 'rgba(33, 150, 243, 0.1)';
    highBtn.style.background = 'rgba(233, 30, 99, 0.08)';

    // Відкриваємо потрібну (або закриваємо, якщо вона була відкрита)
    if (isOpeningLow) {
        lowBox.style.display = 'block';
        lowBtn.style.background = 'rgba(33, 150, 243, 0.22)';
    } else if (isOpeningHigh) {
        highBox.style.display = 'block';
        highBtn.style.background = 'rgba(233, 30, 99, 0.2)';
    }
}

// ============================================================================
// УНІВЕРСАЛЬНА ФУНКЦІЯ ВИВЕДЕННЯ РЕЗУЛЬТАТУ З КНОПКОЮ «ПОДІЛИТИСЯ»
// ============================================================================
function showResultWithShare(resultDivId, htmlContent, extraBtnHtml = '') {
    const container = document.getElementById(resultDivId);
    if (!container) return;

    // 🟢 1. Ховаємо екранну клавіатуру, щоб вона не перекривала результат
    if (document.activeElement) document.activeElement.blur();

    // 🟢 2. Легкий вібровідгук на смартфоні (відчуття нативного додатку)
    if (navigator.vibrate) navigator.vibrate(15);

    const shareBtnHtml = `
        <div class="share-btn-wrap" style="margin-top: 8px; display: flex; justify-content: flex-end; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${extraBtnHtml}
            <button type="button" class="btn-share-result" onclick="shareCalculation('${resultDivId}')" 
                    style="display: inline-flex; align-items: center; gap: 5px; background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; color: #81c784; padding: 4px 10px; border-radius: 14px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                📤 Поділитись
            </button>
        </div>
    `;

    container.innerHTML = htmlContent + shareBtnHtml;
    container.style.display = 'block';

    // 🟢 3. Плавний підскрол до результату, якщо він не поміщається на екрані
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
}

function shareCalculation(resultDivId) {
    const resultDiv = document.getElementById(resultDivId);
    if (!resultDiv) return;

    // Клонуємо блок, щоб видалити саму кнопку перед копіюванням
    const clone = resultDiv.cloneNode(true);
    const shareBtnWrap = clone.querySelector('.share-btn-wrap');
    if (shareBtnWrap) shareBtnWrap.remove();

    // innerText автоматично зберігає всі переноси рядків, відступи й прибирає HTML-теги
    const cleanText = clone.innerText.trim();
    
    // Посилання на твій сайт (бере поточну адресу без зайвих хешів):
    const siteUrl = window.location.href.split('#')[0];

    // Формуємо фінальний текст за твоїм шаблоном:
    const finalMessage = 
`⚡ Engineering Tools. Твій мобільний штаб Енергонезалежності!

${cleanText}

Посилання, щоб спробувати самостійно:
${siteUrl}`;

    // Якщо це смартфон із підтримкою системного вікна "Поділитися" (Telegram, Viber, SMS тощо):
    if (navigator.share) {
        navigator.share({
            title: 'Engineering Tools',
            text: finalMessage
        }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        // Якщо це ПК або старий браузер — копіюємо в буфер:
        navigator.clipboard.writeText(finalMessage).then(() => {
            alert('📋 Результати скопійовано у буфер обміну!');
        }).catch(() => {
            fallbackCopy(finalMessage);
        });
    } else {
        fallbackCopy(finalMessage);
    }
}

// Запасний варіант копіювання для старих браузерів
function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        alert('📋 Результати скопійовано у буфер обміну!');
    } catch(e) {
        alert('Виділіть і скопіюйте текст вручну.');
    }
    document.body.removeChild(ta);
}


// ============================================================================
// 15. УНІВЕРСАЛЬНИЙ АРСЕНАЛ v3.0 (SLOT-BASED ENGINE)
// ============================================================================

// -------------------------------------------------------------
// Категорії користувача
// -------------------------------------------------------------
function getArsenalCategories() {
    const saved = localStorage.getItem('arsenal_categories_v3');
    if (saved) {
        try { return JSON.parse(saved); } catch(e) {}
    }
    const defaults = ["Загальне", "Мій EDC", "Зв'язок", "Освітлення", "Резерв"];
    localStorage.setItem('arsenal_categories_v3', JSON.stringify(defaults));
    return defaults;
}

function renderCategorySelect() {
    const sel = document.getElementById('device_user_category');
    if (!sel) return;
    const cats = getArsenalCategories();
    sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function toggleNewCategoryInput() {
    const box = document.getElementById('new_category_box');
    if (!box) return;
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

function saveNewCategory() {
    const nameInput = document.getElementById('new_category_name');
    const val = nameInput.value.trim();
    if (!val) return alert('Введіть назву категорії');
    const cats = getArsenalCategories();
    if (!cats.includes(val)) {
        cats.push(val);
        localStorage.setItem('arsenal_categories_v3', JSON.stringify(cats));
    }
    renderCategorySelect();
    document.getElementById('device_user_category').value = val;
    nameInput.value = '';
    document.getElementById('new_category_box').style.display = 'none';
}

// -------------------------------------------------------------
// Перемикання динамічних полів у формі додавання пристрою
// -------------------------------------------------------------
function toggleArsenalRoleFields() {
    const role = document.getElementById('device_role').value;
    document.getElementById('role_source_fields').style.display = (role === 'source') ? 'block' : 'none';
    document.getElementById('role_load_fields').style.display = (role === 'passive_load') ? 'block' : 'none';
    document.getElementById('role_rechargeable_fields').style.display = (role === 'rechargeable') ? 'block' : 'none';
}

function toggleSourceCapFields() {
    const type = document.getElementById('source_cap_type').value;
    const label = document.getElementById('source_cap_label');
    const input = document.getElementById('source_cap_value');
    if (type === 'wh') {
        label.textContent = 'Ємність джерела (Wh):';
        input.placeholder = 'Наприклад: 500';
    } else {
        label.textContent = 'Ємність джерела (mAh):';
        input.placeholder = 'Наприклад: 20000';
    }
}

function toggleSourceVoltageField() {
    const chemType = document.getElementById('source_chemistry').value;
    const vGroup = document.getElementById('source_voltage_group');
    const vInput = document.getElementById('source_voltage');
    if (chemType === 'lead_acid') {
        vGroup.style.display = 'block';
        vInput.value = '12';
    } else if (chemType === 'lifepo4') {
        vGroup.style.display = 'block';
        vInput.value = '12.8';
    } else {
        vGroup.style.display = 'none';
    }
}

function toggleSourcePowerFields() {
    const type = document.getElementById('source_power_type').value;
    document.getElementById('source_w_box').style.display = (type === 'w') ? 'block' : 'none';
    document.getElementById('source_va_box').style.display = (type === 'va') ? 'flex' : 'none';
}

function toggleLoadPowerFields() {
    const type = document.getElementById('load_power_type').value;
    document.getElementById('load_w_box').style.display = (type === 'w') ? 'block' : 'none';
    document.getElementById('load_va_box').style.display = (type === 'va') ? 'flex' : 'none';
}

function toggleLoadLightField() {
    const isLight = document.getElementById('load_is_light').checked;
    document.getElementById('load_light_box').style.display = isLight ? 'block' : 'none';
}

function toggleRechCapFields() {
    const type = document.getElementById('rech_cap_type').value;
    const label = document.getElementById('rech_cap_label');
    const input = document.getElementById('rech_cap_value');
    if (type === 'wh') {
        label.textContent = 'Ємність вбудованого АКБ (Wh):';
        input.placeholder = 'Наприклад: 15';
    } else {
        label.textContent = 'Ємність вбудованого АКБ (mAh):';
        input.placeholder = 'Наприклад: 4000';
    }
}

function toggleRechPowerFields() {
    const type = document.getElementById('rech_power_type').value;
    document.getElementById('rech_w_box').style.display = (type === 'w') ? 'block' : 'none';
    document.getElementById('rech_va_box').style.display = (type === 'va') ? 'flex' : 'none';
}

function toggleRechLightField() {
    const isLight = document.getElementById('rech_is_light').checked;
    document.getElementById('rech_light_box').style.display = isLight ? 'block' : 'none';
}
let editingDeviceId = null;

function openAddDeviceForm() {
    editingDeviceId = null; // Скидаємо ID (режим створення)
    
    // Повертаємо початкові написи у вікні
    const modalTitle = document.querySelector('#addDeviceModal h3');
    if (modalTitle) modalTitle.textContent = '+ Додати пристрій в Арсенал v3.0';
    const submitBtn = document.querySelector('#addDeviceModal .btn-primary');
    if (submitBtn) submitBtn.textContent = '💾 Зберегти в Арсенал';

    renderCategorySelect();
    if (document.getElementById('device_name')) document.getElementById('device_name').value = '';
    if (document.getElementById('device_role')) document.getElementById('device_role').value = 'source';
    if (document.getElementById('new_category_box')) document.getElementById('new_category_box').style.display = 'none';

    // Скидання полів Джерела
    if (document.getElementById('source_cap_type')) document.getElementById('source_cap_type').value = 'mah';
    if (document.getElementById('source_cap_value')) document.getElementById('source_cap_value').value = '';
    if (document.getElementById('source_chemistry')) document.getElementById('source_chemistry').value = 'lithium';
    if (document.getElementById('source_voltage')) document.getElementById('source_voltage').value = '';
    if (document.getElementById('source_power_type')) document.getElementById('source_power_type').value = 'w';
    if (document.getElementById('source_watts')) document.getElementById('source_watts').value = '';
    if (document.getElementById('source_volts')) document.getElementById('source_volts').value = '5';
    if (document.getElementById('source_amps')) document.getElementById('source_amps').value = '2';
    toggleSourceCapFields();
    toggleSourceVoltageField();
    toggleSourcePowerFields();

    // Скидання полів Споживача
    if (document.getElementById('load_power_type')) document.getElementById('load_power_type').value = 'w';
    if (document.getElementById('load_watts')) document.getElementById('load_watts').value = '';
    if (document.getElementById('load_volts')) document.getElementById('load_volts').value = '12';
    if (document.getElementById('load_amps')) document.getElementById('load_amps').value = '1.5';
    if (document.getElementById('load_is_light')) document.getElementById('load_is_light').checked = false;
    if (document.getElementById('load_lumens')) document.getElementById('load_lumens').value = '';
    toggleLoadPowerFields();
    toggleLoadLightField();

    // Скидання полів Акумуляторного гаджета
    if (document.getElementById('rech_cap_type')) document.getElementById('rech_cap_type').value = 'mah';
    if (document.getElementById('rech_cap_value')) document.getElementById('rech_cap_value').value = '';
    if (document.getElementById('rech_chemistry')) document.getElementById('rech_chemistry').value = 'lithium';
    if (document.getElementById('rech_power_type')) document.getElementById('rech_power_type').value = 'w';
    if (document.getElementById('rech_watts')) document.getElementById('rech_watts').value = '';
    if (document.getElementById('rech_volts')) document.getElementById('rech_volts').value = '5';
    if (document.getElementById('rech_amps')) document.getElementById('rech_amps').value = '2';
    if (document.getElementById('rech_is_light')) document.getElementById('rech_is_light').checked = false;

    // 🟢 БЕЗПЕЧНЕ СКИДАННЯ РЕЖИМІВ (замість старого rech_lumens):
    const oldRechLumens = document.getElementById('rech_lumens');
    if (oldRechLumens) oldRechLumens.value = '';

    if (document.getElementById('rech_mode1_name')) document.getElementById('rech_mode1_name').value = 'Еко';
    if (document.getElementById('rech_mode1_lm')) document.getElementById('rech_mode1_lm').value = '30';
    if (document.getElementById('rech_mode2_name')) document.getElementById('rech_mode2_name').value = 'Сер.';
    if (document.getElementById('rech_mode2_lm')) document.getElementById('rech_mode2_lm').value = '150';
    if (document.getElementById('rech_mode3_name')) document.getElementById('rech_mode3_name').value = 'Турбо';
    if (document.getElementById('rech_mode3_lm')) document.getElementById('rech_mode3_lm').value = '500';

    toggleRechCapFields();
    toggleRechPowerFields();
    toggleRechLightField();

    toggleArsenalRoleFields();
    openModal('addDeviceModal');
}

// -------------------------------------------------------------
// Відкриття пристрою для редагування
// -------------------------------------------------------------
function editDeviceV3(id) {
    const dev = ArsenalV3.getDevices().find(d => d.id === id);
    if (!dev) return;

    editingDeviceId = id; // Запам'ятовуємо, який девайс редагуємо

    // Змінюємо заголовок і кнопку на режим редагування
    const modalTitle = document.querySelector('#addDeviceModal h3');
    if (modalTitle) modalTitle.textContent = '✏️ Редагувати пристрій';
    const submitBtn = document.querySelector('#addDeviceModal .btn-primary');
    if (submitBtn) submitBtn.textContent = '💾 Зберегти зміни';

    renderCategorySelect();
    document.getElementById('device_user_category').value = dev.userCategory || 'Загальне';
    document.getElementById('device_name').value = dev.name;
    document.getElementById('device_role').value = dev.role;
    document.getElementById('new_category_box').style.display = 'none';

    toggleArsenalRoleFields();

    // Заповнюємо поля відповідно до ролі пристрою
    if (dev.role === 'source') {
        document.getElementById('source_cap_type').value = dev.capacity?.unit || 'mah';
        toggleSourceCapFields();
        document.getElementById('source_cap_value').value = dev.capacity?.value || '';
        document.getElementById('source_chemistry').value = dev.capacity?.chemistry || 'lithium';
        toggleSourceVoltageField();
        document.getElementById('source_voltage').value = dev.capacity?.voltage || '';

        const isVa = dev.power?.type === 'va';
        document.getElementById('source_power_type').value = isVa ? 'va' : 'w';
        toggleSourcePowerFields();
        if (isVa) {
            document.getElementById('source_volts').value = dev.power?.volts || 5;
            document.getElementById('source_amps').value = dev.power?.amps || 2;
        } else {
            document.getElementById('source_watts').value = dev.power?.watts || '';
        }
    } 
    else if (dev.role === 'passive_load') {
        const isVa = dev.power?.type === 'va';
        document.getElementById('load_power_type').value = isVa ? 'va' : 'w';
        toggleLoadPowerFields();
        if (isVa) {
            document.getElementById('load_volts').value = dev.power?.volts || 12;
            document.getElementById('load_amps').value = dev.power?.amps || 1.5;
        } else {
            document.getElementById('load_watts').value = dev.power?.watts || '';
        }

        const isLight = !!(dev.lighting && dev.lighting.isLightSource);
        document.getElementById('load_is_light').checked = isLight;
        toggleLoadLightField();
        document.getElementById('load_lumens').value = dev.lighting?.lumens || '';
    } 
    else if (dev.role === 'rechargeable') {
        document.getElementById('rech_cap_type').value = dev.capacity?.unit || 'mah';
        toggleRechCapFields();
        document.getElementById('rech_cap_value').value = dev.capacity?.value || '';
        document.getElementById('rech_chemistry').value = dev.capacity?.chemistry || 'lithium';

        const isVa = dev.power?.type === 'va';
        document.getElementById('rech_power_type').value = isVa ? 'va' : 'w';
        toggleRechPowerFields();
        if (isVa) {
            document.getElementById('rech_volts').value = dev.power?.volts || 5;
            document.getElementById('rech_amps').value = dev.power?.amps || 2;
        } else {
            document.getElementById('rech_watts').value = dev.power?.watts || '';
        }

        const isLight = !!(dev.lighting && dev.lighting.isLightSource);
        document.getElementById('rech_is_light').checked = isLight;
        toggleRechLightField();
        
        if (isLight && dev.lighting.modes && dev.lighting.modes.length >= 3) {
            document.getElementById('rech_mode1_name').value = dev.lighting.modes[0].label;
            document.getElementById('rech_mode1_lm').value = dev.lighting.modes[0].lumens;
            document.getElementById('rech_mode2_name').value = dev.lighting.modes[1].label;
            document.getElementById('rech_mode2_lm').value = dev.lighting.modes[1].lumens;
            document.getElementById('rech_mode3_name').value = dev.lighting.modes[2].label;
            document.getElementById('rech_mode3_lm').value = dev.lighting.modes[2].lumens;
        } else {
            document.getElementById('rech_mode1_name').value = 'Еко';
            document.getElementById('rech_mode1_lm').value = 30;
            document.getElementById('rech_mode2_name').value = 'Сер.';
            document.getElementById('rech_mode2_lm').value = 150;
            document.getElementById('rech_mode3_name').value = 'Турбо';
            document.getElementById('rech_mode3_lm').value = 500;
        }
    }

    openModal('addDeviceModal');
}
// -------------------------------------------------------------
// Збереження нового пристрою (Арсенал v3.0)
// -------------------------------------------------------------
function addDeviceToStorageV3() {
    const name = document.getElementById('device_name').value.trim();
    const vName = validateFields([{ name: 'Назва пристрою', value: name, isText: true }]);
    if (!vName.ok) return alert(vName.message);

    const userCategory = document.getElementById('device_user_category').value || 'Загальне';
    const role = document.getElementById('device_role').value;

    let capacity = { value: null, unit: 'mah', chemistry: 'lithium', voltage: 3.7 };
    let power = { type: 'direct_watts', watts: null, volts: 5, amps: null };
    let lighting = { isLightSource: false, lumens: null };

    if (role === 'source') {
        const capVal = Number(document.getElementById('source_cap_value').value);
        const vCap = validateFields([{ name: 'Ємність джерела', value: capVal, positive: true }]);
        if (!vCap.ok) return alert(vCap.message);

        capacity.unit = document.getElementById('source_cap_type').value;
        capacity.value = capVal;
        capacity.chemistry = document.getElementById('source_chemistry').value;
        const vInput = Number(document.getElementById('source_voltage').value);
        capacity.voltage = vInput > 0 ? vInput : chem(capacity.chemistry).vNom;

        const pType = document.getElementById('source_power_type').value;
        if (pType === 'w') {
            power.type = 'direct_watts';
            power.watts = Number(document.getElementById('source_watts').value) || null;
            power.volts = capacity.voltage;
            power.amps = power.watts ? power.watts / power.volts : null;
        } else {
            const v = Number(document.getElementById('source_volts').value) || 5;
            const a = Number(document.getElementById('source_amps').value) || 2;
            power.type = 'va';
            power.volts = v;
            power.amps = a;
            power.watts = Math.round(v * a * 100) / 100;
        }
    } 
    else if (role === 'passive_load') {
        const pType = document.getElementById('load_power_type').value;
        if (pType === 'w') {
            power.type = 'direct_watts';
            power.watts = Number(document.getElementById('load_watts').value);
            power.volts = 12;
            power.amps = power.watts / 12;
        } else {
            const v = Number(document.getElementById('load_volts').value);
            const a = Number(document.getElementById('load_amps').value);
            const vVA = validateFields([
                { name: 'Напруга споживача (V)', value: v, positive: true },
                { name: 'Струм споживача (A)', value: a, positive: true }
            ]);
            if (!vVA.ok) return alert(vVA.message);

            power.type = 'va';
            power.volts = v;
            power.amps = a;
            power.watts = Math.round(v * a * 100) / 100;
        }

        const vPwr = validateFields([{ name: 'Потужність споживання (W)', value: power.watts, positive: true }]);
        if (!vPwr.ok) return alert(vPwr.message);

        lighting.isLightSource = document.getElementById('load_is_light').checked;
        if (lighting.isLightSource) {
            lighting.lumens = Number(document.getElementById('load_lumens').value) || null;
        }
    } 
    else if (role === 'rechargeable') {
        const capVal = Number(document.getElementById('rech_cap_value').value);
        const vCap = validateFields([{ name: 'Ємність вбудованого АКБ', value: capVal, positive: true }]);
        if (!vCap.ok) return alert(vCap.message);

        capacity.unit = document.getElementById('rech_cap_type').value;
        capacity.value = capVal;
        capacity.chemistry = document.getElementById('rech_chemistry').value;
        capacity.voltage = chem(capacity.chemistry).vNom;

        const pType = document.getElementById('rech_power_type').value;
        if (pType === 'w') {
            power.type = 'direct_watts';
            power.watts = Number(document.getElementById('rech_watts').value);
            power.volts = 5;
            power.amps = power.watts ? power.watts / 5 : null;
        } else {
            const v = Number(document.getElementById('rech_volts').value) || 5;
            const a = Number(document.getElementById('rech_amps').value) || 2;
            power.type = 'va';
            power.volts = v;
            power.amps = a;
            power.watts = Math.round(v * a * 100) / 100;
        }

        lighting.isLightSource = document.getElementById('rech_is_light').checked;
        if (lighting.isLightSource) {
            const m1Name = document.getElementById('rech_mode1_name').value.trim() || 'Еко';
            const m1Lm = Number(document.getElementById('rech_mode1_lm').value) || 30;
            const m2Name = document.getElementById('rech_mode2_name').value.trim() || 'Сер.';
            const m2Lm = Number(document.getElementById('rech_mode2_lm').value) || 150;
            const m3Name = document.getElementById('rech_mode3_name').value.trim() || 'Турбо';
            const m3Lm = Number(document.getElementById('rech_mode3_lm').value) || 500;

            lighting.modes = [
                { label: m1Name, lumens: m1Lm },
                { label: m2Name, lumens: m2Lm },
                { label: m3Name, lumens: m3Lm }
            ];
            lighting.lumens = m3Lm;
        }
    }

    const newDevice = {
        id: editingDeviceId ? editingDeviceId : ('dev_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
        name,
        userCategory,
        role,
        capacity,
        power,
        lighting
    };

    const devices = ArsenalV3.getDevices();

    if (editingDeviceId) {
        const idx = devices.findIndex(d => d.id === editingDeviceId);
        if (idx !== -1) {
            devices[idx] = newDevice;
        }
        editingDeviceId = null;
    } else {
        devices.push(newDevice);
    }

    ArsenalV3.saveDevices(devices);
    closeModal('addDeviceModal');
    refreshAllArsenalContainers();
    alert(`✅ ${name} успішно збережено в Арсенал!`);
}
// -------------------------------------------------------------
// Ядро Арсеналу v3.0 (Слоти, Міграція, Авто-рендеринг)
// -------------------------------------------------------------
const ArsenalV3 = {
    getDevices: function() {
        const data = localStorage.getItem('arsenal_devices_v3');
        if (data) {
            try { return JSON.parse(data); } catch(e) {}
        }

        // Автоматична міграція з попередніх версій v2/v1
        const oldData = localStorage.getItem('arsenal_devices_v2') || localStorage.getItem('arsenal_devices');
        if (oldData) {
            try {
                const parsed = JSON.parse(oldData);
                const migrated = parsed.map((d, i) => {
                    const isPb = d.type === 'powerbank';
                    const isLight = d.type === 'light';
                    return {
                        id: d.id || 'dev_migrated_' + Date.now() + '_' + i,
                        name: d.name || 'Пристрій ' + (i + 1),
                        userCategory: isPb ? 'Резерв' : (isLight ? 'Освітлення' : 'Загальне'),
                        role: isPb ? 'source' : (d.capacity ? 'rechargeable' : 'passive_load'),
                        capacity: {
                            value: d.capacity || (isPb ? 10000 : null),
                            unit: 'mah',
                            chemistry: 'lithium',
                            voltage: d.voltage || 3.7
                        },
                        power: {
                            type: 'direct_watts',
                            watts: d.power || (d.voltage ? d.voltage * 1 : 10),
                            volts: d.voltage || 5,
                            amps: 1
                        },
                        lighting: {
                            isLightSource: isLight,
                            lumens: isLight ? 500 : null
                        }
                    };
                });
                localStorage.setItem('arsenal_devices_v3', JSON.stringify(migrated));
                return migrated;
            } catch (e) { return []; }
        }
        return [];
    },

    saveDevices: function(arr) {
        localStorage.setItem('arsenal_devices_v3', JSON.stringify(arr));
        renderDeviceListV3();
    },

    getIcon: function(dev) {
        if (dev.lighting && dev.lighting.isLightSource) return '💡';
        if (dev.role === 'source') return '🔋';
        if (dev.role === 'rechargeable') return '📱';
        return '🔌';
    },

    getRoleBadge: function(role) {
        if (role === 'source') return '<span class="role-badge badge-source">Джерело</span>';
        if (role === 'passive_load') return '<span class="role-badge badge-load">Споживач</span>';
        if (role === 'rechargeable') return '<span class="role-badge badge-rechargeable">Акум. гаджет</span>';
        return '';
    },

    // 4 Універсальні Слоти-Контракти (Специфікація ТЗ)
    getBySlot: function(slotType) {
        const devices = this.getDevices();
        if (slotType === 'SOURCE') {
            return devices.filter(d => d.role === 'source' && d.capacity && d.capacity.value > 0);
        }
        if (slotType === 'LOAD') {
            return devices.filter(d => d.role === 'passive_load' || d.role === 'rechargeable' || (d.power && d.power.watts > 0));
        }
        if (slotType === 'RECHARGE_TARGET') {
            return devices.filter(d => d.role === 'rechargeable' && d.capacity && d.capacity.value > 0);
        }
        if (slotType === 'LIGHTING') {
            return devices.filter(d => d.lighting && d.lighting.isLightSource);
        }
        return devices;
    },

    // Забезпечує наявність контейнера у формі
    ensureContainer: function(modalId, containerId, beforeSelector) {
        let container = document.getElementById(containerId);
        if (!container) {
            const modalContent = document.querySelector(`#${modalId} .modal-content`);
            if (modalContent) {
                container = document.createElement('div');
                container.id = containerId;
                container.className = 'arsenal-selector-container';
                container.style.marginBottom = '15px';
                if (beforeSelector) {
                    const ref = modalContent.querySelector(beforeSelector);
                    if (ref) {
                        modalContent.insertBefore(container, ref);
                        return container;
                    }
                }
                const h3 = modalContent.querySelector('h3');
                if (h3 && h3.nextSibling) {
                    modalContent.insertBefore(container, h3.nextSibling);
                } else {
                    modalContent.prepend(container);
                }
            }
        }
        return container;
    },

    renderSingle: function(containerId, slotType, targetType) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const devices = this.getBySlot(slotType);

        if (devices.length === 0) {
            container.innerHTML = `<p style="color:#888; font-size:11px; margin: 4px 0 10px 0;">🎒 В Арсеналі немає пристроїв для слота <b>${slotType}</b>.</p>`;
            return;
        }

        const options = devices.map(d => {
            const capText = d.capacity?.value ? `${d.capacity.value}${d.capacity.unit}` : '';
            const pwrText = d.power?.watts ? `${d.power.watts}W` : '';
            const desc = [capText, pwrText].filter(Boolean).join(' | ');
            return `<option value="${d.id}">${this.getIcon(d)} ${escapeHtml(d.name)} (${desc})</option>`;
        }).join('');

        container.innerHTML = `
            <div class="arsenal-ui-box">
                <label class="arsenal-ui-title">🎒 Швидкий вибір з Арсеналу [Слот: ${slotType}]:</label>
                <div style="display:flex; gap:10px;">
                    <select id="${containerId}_select" onchange="ArsenalV3.applySingle('${containerId}', '${targetType}')" style="flex:1;">
                        <option value="">— Ввести вручну —</option>
                        ${options}
                    </select>
                    <button class="btn-form" onclick="ArsenalV3.clearSingle('${containerId}', '${targetType}')" style="padding: 8px; width:auto; font-size: 11px;">Очистити</button>
                </div>
            </div>
        `;
    },

    applySingle: function(containerId, targetType) {
        const select = document.getElementById(`${containerId}_select`);
        const deviceId = select ? select.value : '';
        if (!deviceId) return this.clearSingle(containerId, targetType);

        const device = this.getDevices().find(d => d.id === deviceId);
        if (!device) return;

        // КНОПКА 1: Зарядка ПБ
        if (targetType === 'btn1_pb') {
            if (device.capacity?.chemistry && document.getElementById('pb_type')) {
                document.getElementById('pb_type').value = device.capacity.chemistry;
            }
            if (document.getElementById('pb_know_capacity')) {
                document.getElementById('pb_know_capacity').value = device.capacity?.unit === 'wh' ? 'wh' : 'mah';
                togglePbCapacityFields();
            }
            if (device.capacity?.value) document.getElementById('pb_mah').value = device.capacity.value;
            if (device.power?.watts) document.getElementById('pb_watts').value = device.power.watts;
        } 
        // 👇 ВСТАВИТИ ЦЕЙ БЛОК СЮДИ:
        else if (targetType === 'btn2_cell') {
            const chemType = (device.capacity?.chemistry === 'sic') ? 'sic' : 'lithium';
            const typeEl = document.getElementById('liion_type');
            if (typeEl) typeEl.value = chemType;

            const isWh = device.capacity?.unit === 'wh';
            const knowCapEl = document.getElementById('liion_know_capacity');
            if (knowCapEl) {
                knowCapEl.value = isWh ? 'wh' : 'mah';
                toggleLiIonCapacityFields();
            }
            if (device.capacity?.value) {
                document.getElementById('liion_mah').value = device.capacity.value;
            }

            if (device.power?.type === 'va' && device.power.volts && device.power.amps) {
                document.getElementById('know_power').value = 'no';
                togglePowerFields();
                document.getElementById('liion_volts').value = device.power.volts;
                document.getElementById('liion_amps').value = device.power.amps;
            } else if (device.power?.watts) {
                document.getElementById('know_power').value = 'yes';
                togglePowerFields();
                document.getElementById('liion_watts').value = device.power.watts;
            }
        }
        // 👆 КІНЕЦЬ ВСТАВКИ
        
        // КНОПКА 3: Джерело живлення споживачів
        else if (targetType === 'btn3_pb') {
            const isWh = device.capacity?.unit === 'wh';
            document.getElementById('know_wh').value = isWh ? 'yes' : 'no';
            toggleWhFields();
            if (isWh) {
                document.getElementById('worktime_wh').value = device.capacity.value;
            } else {
                if (device.capacity?.value) document.getElementById('worktime_mah').value = device.capacity.value;
                if (device.capacity?.voltage) document.getElementById('worktime_v').value = device.capacity.voltage;
            }
            if (device.power?.watts) document.getElementById('worktime_maxw').value = device.power.watts;
        }
        // КНОПКА 4: Скільки було світло?
        else if (targetType === 'btn4_light') {
            const chemType = device.capacity?.chemistry || 'lithium';
            const lightTypeEl = document.getElementById('light_type');
            if (lightTypeEl) {
                lightTypeEl.value = chemType;
            }

            // 🟢 Автоматично виставляємо mAh чи Wh з вибраного девайса:
            const knowCapEl = document.getElementById('light_know_capacity');
            if (knowCapEl) {
                knowCapEl.value = (device.capacity?.unit === 'wh') ? 'wh' : 'mah';
            }

            toggleLightCapacityFields();

            if (chemType === 'lead_acid') {
                const leadUnitEl = document.getElementById('lead_unit_select');
                if (leadUnitEl) {
                    leadUnitEl.value = device.capacity?.unit === 'ah' ? 'ah' : 'wh';
                    toggleLeadVoltageField();
                }
                if (device.capacity?.voltage) document.getElementById('lead_voltage').value = device.capacity.voltage;
            }

            if (device.capacity?.value) {
                document.getElementById('light_capacity_value').value = device.capacity.value;
            }
        }
        // КНОПКА 5: Головний ПБ
        else if (targetType === 'btn5_pb') {
            if (device.capacity?.chemistry && document.getElementById('charge_stats_pb_type')) {
                document.getElementById('charge_stats_pb_type').value = device.capacity.chemistry;
            }
            const isWh = device.capacity?.unit === 'wh';
            document.getElementById('know_pb_wh').value = isWh ? 'yes' : 'no';
            togglePbWhFields();
            if (isWh) {
                document.getElementById('charge_stats_wh').value = device.capacity.value;
            } else {
                if (device.capacity?.value) document.getElementById('charge_stats_mah').value = device.capacity.value;
            }
        }
        // КНОПКА 6: Ліхтар / Освітлення
        else if (targetType === 'btn6_light') {
            if (device.capacity && device.capacity.value) {
                if (device.capacity.chemistry && document.getElementById('flashlight_type')) {
                    document.getElementById('flashlight_type').value = device.capacity.chemistry;
                }
                const isWh = device.capacity.unit === 'wh';
                document.getElementById('flashlight_know_capacity').value = isWh ? 'wh' : 'mah';
                toggleFlashlightCapacityFields();
                document.getElementById('flashlight_mah').value = device.capacity.value;
            }

            // 🟢 Якщо у пристрою є збережені власні режими:
            if (device.lighting && device.lighting.modes && device.lighting.modes.length > 0) {
                renderFlashlightPresets(device.lighting.modes);
                
                // Автоматично обираємо середній режим (індекс 1):
                const defaultMode = device.lighting.modes[1] || device.lighting.modes[0];
                applyLightPreset(defaultMode.lumens, defaultMode.label);
            } else {
                renderFlashlightPresets(DEFAULT_FLASHLIGHT_PRESETS);
                if (device.lighting?.lumens) {
                    document.getElementById('flashlight_lm').value = device.lighting.lumens;
                }
            }
            document.getElementById('flashlight_mode').value = 'standard';
            toggleFlashlightMode();


        }
        // КНОПКА 7: Режим виживання
        else if (targetType === 'btn7_battery') {
            const chemType = device.capacity?.chemistry || 'lithium';
            document.getElementById('survival_type').value = chemType;
            if (chemType === 'lead_acid') {
                document.getElementById('survival_lead_unit').value = device.capacity?.unit === 'ah' ? 'ah' : 'wh';
                toggleSurvivalVoltageField();
                if (device.capacity?.voltage) document.getElementById('survival_voltage').value = device.capacity.voltage;
            } else if (chemType !== 'lifepo4') {
                document.getElementById('survival_know_capacity').value = device.capacity?.unit === 'wh' ? 'wh' : 'mah';
            }
            toggleSurvivalCapacityFields();
            if (device.capacity?.value) document.getElementById('survival_capacity_value').value = device.capacity.value;
        }
        // КНОПКА 8: Аудит ПБ
        else if (targetType === 'btn8_audit') {
            const chemType = device.capacity?.chemistry || 'lithium';
            document.getElementById('audit_battery_type').value = chemType;
            if (chemType === 'lead_acid') {
                document.getElementById('audit_lead_unit').value = device.capacity?.unit === 'ah' ? 'ah' : 'wh';
                toggleAuditVoltageField();
                if (device.capacity?.voltage) document.getElementById('audit_voltage').value = device.capacity.voltage;
            } else if (chemType !== 'lifepo4') {
                document.getElementById('audit_know_capacity').value = device.capacity?.unit === 'wh' ? 'wh' : 'mah';
            }
            toggleAuditCapacityFields();
            if (device.capacity?.value) document.getElementById('audit_capacity_value').value = device.capacity.value;
        }
        
        // КНОПКА 9: Резервна станція квартири
        else if (targetType === 'btn9_battery') {
            document.getElementById('backup_type').value = (device.capacity?.chemistry === 'lead_acid') ? 'lead_acid' : 'lifepo4';
            const unit = device.capacity?.unit;
            if (unit === 'wh') document.getElementById('backup_know_wh').value = 'yes';
            else if (unit === 'ah') document.getElementById('backup_know_wh').value = 'no_ah';
            else document.getElementById('backup_know_wh').value = 'no_mah';
            toggleBackupWhFields();
            if (unit === 'wh') {
                document.getElementById('backup_wh').value = device.capacity.value;
            } else if (unit === 'ah') {
                document.getElementById('backup_ah').value = device.capacity.value;
            } else {
                document.getElementById('backup_mah').value = device.capacity.value;
            }
            if (device.capacity?.voltage) document.getElementById('backup_voltage').value = device.capacity.voltage;
        }
        // КНОПКА 10: Регенерація станції
        else if (targetType === 'btn10_recharge') {
            if (device.capacity?.chemistry) {
                document.getElementById('recharge_type').value = device.capacity.chemistry;
            }
            const unit = device.capacity?.unit || 'wh';
            document.getElementById('recharge_know_capacity').value = unit;
            toggleRechargeCapacityFields();
            if (unit === 'wh') {
                document.getElementById('recharge_wh').value = device.capacity.value;
            } else if (unit === 'ah') {
                document.getElementById('recharge_ah').value = device.capacity.value;
            } else {
                document.getElementById('recharge_mah').value = device.capacity.value;
            }
            if (device.capacity?.voltage) document.getElementById('recharge_voltage').value = device.capacity.voltage;
        }
    },

    clearSingle: function(containerId, targetType) {
        const select = document.getElementById(`${containerId}_select`);
        if (select) select.value = '';
        if (targetType === 'btn1_pb') {
            document.getElementById('pb_mah').value = '';
            document.getElementById('pb_watts').value = '';
        } else if (targetType === 'btn2_cell') {
            document.getElementById('liion_mah').value = '';
            document.getElementById('liion_watts').value = '';
            document.getElementById('liion_volts').value = '';
            document.getElementById('liion_amps').value = ''; }
            else if (targetType === 'btn3_pb') {
            document.getElementById('worktime_mah').value = '';
            document.getElementById('worktime_wh').value = '';
            document.getElementById('worktime_v').value = '3.7';
            document.getElementById('worktime_maxw').value = '';
        } else if (targetType === 'btn4_light') {
            document.getElementById('light_capacity_value').value = '';
        } else if (targetType === 'btn5_pb') {
            document.getElementById('charge_stats_mah').value = '';
            document.getElementById('charge_stats_wh').value = '';
        } else if (targetType === 'btn6_light') {
            document.getElementById('flashlight_mah').value = '';
            document.getElementById('flashlight_lm').value = '';
            document.getElementById('flashlight_manual_watts').value = '';
            renderFlashlightPresets(DEFAULT_FLASHLIGHT_PRESETS);
            clearFlashlightPresetHighlight();
        } else if (targetType === 'btn7_battery') {
            document.getElementById('survival_capacity_value').value = '';
        } else if (targetType === 'btn8_audit') {
            document.getElementById('audit_capacity_value').value = '';
        } else if (targetType === 'btn9_battery') {
            document.getElementById('backup_mah').value = '';
            document.getElementById('backup_ah').value = '';
            document.getElementById('backup_wh').value = '';
        } else if (targetType === 'btn10_recharge') {
            document.getElementById('recharge_mah').value = '';
            document.getElementById('recharge_ah').value = '';
            document.getElementById('recharge_wh').value = '';
        }
    },

    renderMulti: function(containerId, slotType, targetBtn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const devices = this.getBySlot(slotType);

        if (devices.length === 0) {
            container.innerHTML = `<p style="color:#888; font-size:11px; margin: 4px 0 10px 0;">🎒 Немає пристроїв для слота <b>${slotType}</b>.</p>`;
            return;
        }

        const tags = devices.map(d => {
            const pwr = d.power?.watts ? `${d.power.watts}W` : (d.capacity?.value ? `${d.capacity.value}${d.capacity.unit}` : '');
            return `
                <span class="arsenal-tag" data-id="${d.id}" onclick="this.classList.toggle('selected')">
                    ${this.getIcon(d)} ${escapeHtml(d.name)} (${pwr})
                </span>
            `;
        }).join('');

        container.innerHTML = `
            <div class="arsenal-ui-box">
                <label class="arsenal-ui-title">🎒 Додати споживачів з Арсеналу [Слот: ${slotType}]:</label>
                <div class="arsenal-tags" id="${containerId}_tags">${tags}</div>
                <button class="btn-form" onclick="ArsenalV3.applyMulti('${containerId}', '${targetBtn}')" style="background:#4CAF50; padding:8px; font-size:12px; margin-top:5px;">
                    + Додати вибрані до розрахунку
                </button>
            </div>
        `;
    },

    applyMulti: function(containerId, targetBtn) {
        const tagsBox = document.getElementById(`${containerId}_tags`);
        if (!tagsBox) return;
        const selectedTags = tagsBox.querySelectorAll('.arsenal-tag.selected');
        const devices = this.getDevices();
        if (selectedTags.length === 0) return alert('Оберіть принаймні один пристрій!');

        const selectedDevices = Array.from(selectedTags).map(tag => devices.find(d => d.id === tag.dataset.id)).filter(Boolean);

        // КНОПКА 9: Home Backup споживачі
        if (targetBtn === 'btn9_backup') {
            const countInput = document.getElementById('backup_count');
            const currentCount = Number(countInput.value) || 0;
            countInput.value = currentCount + selectedDevices.length;
            updateBackupConsumerFields();
            
            selectedDevices.forEach((dev, index) => {
                const targetId = currentCount + index + 1;
                const knowEl = document.getElementById(`backup_consumer_${targetId}_know`);
                if (knowEl) {
                    knowEl.value = 'w';
                    toggleBackupConsumerFields(targetId);
                    const wEl = document.getElementById(`backup_consumer_${targetId}_w`);
                    if (wEl) wEl.value = dev.power?.watts || 10;
                }
            });
        } 
        // КНОПКА 5: Аналіз гаджетів під зарядку
        else if (targetBtn === 'btn5_chargestats') {
            const countInput = document.getElementById('charge_stats_p4');
            const currentCount = Number(countInput.value) || 0;
            countInput.value = currentCount + selectedDevices.length;
            updateChargeDeviceFields();
            
            selectedDevices.forEach((dev, index) => {
                const targetId = currentCount + index + 1;
                const isWh = dev.capacity?.unit === 'wh';
                document.getElementById(`device_${targetId}_know_wh`).value = isWh ? 'yes' : 'no';
                toggleDeviceWhFields(targetId);
                if (isWh) {
                    document.getElementById(`device_${targetId}_wh`).value = dev.capacity.value;
                } else {
                    document.getElementById(`device_${targetId}_mah`).value = dev.capacity?.value || 3000;
                }
                document.getElementById(`device_${targetId}_p`).value = 0;
            });
        } 
        // КНОПКА 3: Навантаження (Pro Mode)
        else if (targetBtn === 'btn3_consumers') {
            const countInput = document.getElementById('worktime_count');
            const currentCount = Number(countInput.value) || 0;
            countInput.value = currentCount + selectedDevices.length;
            updateConsumerFields();

            selectedDevices.forEach((dev, index) => {
                const targetId = currentCount + index + 1;
                const knowEl = document.getElementById(`consumer_${targetId}_know`);
                if (knowEl) {
                    knowEl.value = 'yes';
                    toggleConsumerFields(targetId);
                }
                const wEl = document.getElementById(`consumer_${targetId}_w`);
                if (wEl) wEl.value = dev.power?.watts || 10;
            });
        }
        selectedTags.forEach(t => t.classList.remove('selected'));
    }
};

function renderDeviceListV3() {
    const listDiv = document.getElementById('deviceList');
    if (!listDiv) return;

    const devices = ArsenalV3.getDevices();
    if (devices.length === 0) {
        listDiv.innerHTML = "<span style='color:#888'>Арсенал порожній</span>";
        return;
    }

    listDiv.innerHTML = devices.map(d => {
        const catBadge = `<span class="category-badge">${escapeHtml(d.userCategory || 'Загальне')}</span>`;
        const roleBadge = ArsenalV3.getRoleBadge(d.role);
        
        let details = [];
        if (d.capacity?.value) details.push(`🔋 ${d.capacity.value} ${d.capacity.unit.toUpperCase()} (${chem(d.capacity.chemistry).label})`);
        if (d.power?.watts) details.push(`⚡ ${d.power.watts}W`);
        if (d.lighting?.isLightSource) details.push(`💡 ${d.lighting.lumens ? d.lighting.lumens + ' Lm' : 'Світло'}`);

        return `
            <div class="device-item">
                <div class="device-info">
                    <div class="device-title">
                        <span>${ArsenalV3.getIcon(d)}</span>
                        <span>${escapeHtml(d.name)}</span>
                        ${roleBadge}
                    </div>
                    <div class="device-meta">
                        ${catBadge}
                        <span>${details.join(' • ')}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
    <span style="color:#4CAF50; cursor:pointer; font-size:15px; padding:4px 6px;" onclick="editDeviceV3('${d.id}')" title="Редагувати">✏️</span>
    <span style="color:#ff4444; cursor:pointer; font-weight:bold; font-size:15px; padding:4px 6px;" onclick="deleteDeviceV3('${d.id}')" title="Видалити">✕</span>
</div>
            </div>
        `;
    }).join('');
}

function deleteDeviceV3(id) {
    if (!confirm('Видалити цей пристрій з Арсеналу?')) return;
    const devices = ArsenalV3.getDevices().filter(d => d.id !== id);
    ArsenalV3.saveDevices(devices);
    refreshAllArsenalContainers();
}

// -------------------------------------------------------------
// РЕЗЕРВНЕ КОПІЮВАННЯ АРСЕНАЛУ (Експорт та Імпорт)
// -------------------------------------------------------------

// 1. Експорт Арсеналу у файл .json
function exportArsenalJSON() {
    const devices = ArsenalV3.getDevices();
    if (devices.length === 0) {
        return alert("⚠️ В Арсеналі немає пристроїв для збереження!");
    }

    const categories = getArsenalCategories();
    const backupData = {
        app: "Engineering Tools",
        version: "6.0",
        exportedAt: new Date().toISOString(),
        categories: categories,
        devices: devices
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `arsenal_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// 2. Виклик вибору файлу для відновлення
function triggerImportArsenal() {
    const fileInput = document.getElementById('arsenal_file_input');
    if (fileInput) fileInput.click();
}

// 3. Читання файлу та відновлення даних
function importArsenalJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            let importedDevices = [];
            let importedCategories = [];

            // Перевіряємо формат (чи це наш повний бекап, чи просто масив)
            if (Array.isArray(parsed)) {
                importedDevices = parsed;
            } else if (parsed.devices && Array.isArray(parsed.devices)) {
                importedDevices = parsed.devices;
                if (parsed.categories && Array.isArray(parsed.categories)) {
                    importedCategories = parsed.categories;
                }
            } else {
                throw new Error("Невідомий формат файлу");
            }

            if (importedDevices.length === 0) {
                return alert("⚠️ У вибраному файлі немає пристроїв!");
            }

            if (!confirm(`Відновити ${importedDevices.length} пристроїв з файлу? Це оновить ваш поточний Арсенал.`)) {
                event.target.value = '';
                return;
            }

            // Зберігаємо пристрої
            ArsenalV3.saveDevices(importedDevices);

            // Якщо у файлі були категорії — об'єднуємо їх
            if (importedCategories.length > 0) {
                const currentCats = getArsenalCategories();
                const mergedCats = Array.from(new Set([...currentCats, ...importedCategories]));
                localStorage.setItem('arsenal_categories_v3', JSON.stringify(mergedCats));
            }

            refreshAllArsenalContainers();
            alert(`✅ Успішно відновлено ${importedDevices.length} пристроїв!`);
        } catch (err) {
            alert("❌ Помилка імпорту: файл пошкоджений або має неправильний формат.");
        } finally {
            event.target.value = ''; // скидаємо вибір файлу
        }
    };
    reader.readAsText(file);
}

function refreshAllArsenalContainers() {
    ArsenalV3.renderSingle('arsenal_single_1', 'SOURCE', 'btn1_pb');
    ArsenalV3.renderSingle('arsenal_single_2', 'RECHARGE_TARGET', 'btn2_cell'); 
    ArsenalV3.renderSingle('arsenal_single_3', 'SOURCE', 'btn3_pb');
    ArsenalV3.renderSingle('arsenal_single_4', 'SOURCE', 'btn4_light');
    ArsenalV3.renderSingle('arsenal_single_5_pb', 'SOURCE', 'btn5_pb');
    ArsenalV3.renderSingle('arsenal_single_6', 'LIGHTING', 'btn6_light');
    ArsenalV3.renderSingle('arsenal_single_7', 'SOURCE', 'btn7_battery');
    ArsenalV3.renderSingle('arsenal_single_8', 'SOURCE', 'btn8_audit');
    ArsenalV3.renderSingle('arsenal_single_9_battery', 'SOURCE', 'btn9_battery');
    ArsenalV3.renderSingle('arsenal_single_10', 'SOURCE', 'btn10_recharge');

    ArsenalV3.renderMulti('arsenal_multi_3', 'LOAD', 'btn3_consumers');
    ArsenalV3.renderMulti('arsenal_multi_5', 'RECHARGE_TARGET', 'btn5_chargestats');
    ArsenalV3.renderMulti('arsenal_multi_9', 'LOAD', 'btn9_backup');
}

// ============================================================================
// 16. ІНІЦІАЛІЗАЦІЯ ПРИ СТАРТІ СТОРІНКИ
// ============================================================================
window.onload = function() {
    updateUncertaintyButton()
    renderDeviceListV3();
    initFlashlightCategories();

// 🟢 Розрахунок по клавіші Enter у модальних вікнах:
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const activeModal = Array.from(document.querySelectorAll('.modal')).find(m => m.style.display === 'block');
        if (activeModal) {
            const calcBtn = activeModal.querySelector('.btn-primary');
            if (calcBtn) calcBtn.click();
        }
    }
});


    const wtCount = document.getElementById('worktime_count');
    if (wtCount) wtCount.addEventListener('input', updateConsumerFields);
    const csCount = document.getElementById('charge_stats_p4');
    if (csCount) csCount.addEventListener('input', updateChargeDeviceFields);
    const bkCount = document.getElementById('backup_count');
    if (bkCount) bkCount.addEventListener('input', updateBackupConsumerFields);
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('online', () => {
        if (document.getElementById('solarModal')?.style.display === 'block') {
            SolarHybrid.updateStatus('🟢', 'Інтернет відновлено', 'api');
        }
    });
    window.addEventListener('offline', () => {
        if (document.getElementById('solarModal')?.style.display === 'block') {
            SolarHybrid.updateStatus('🔵', 'Офлайн режим (формули)', 'offline');
        }
    });
});
// ============================================================================
// 17. АВАРІЙНИЙ ЕКРАН-НІЧНИК
// ============================================================================
let nlWakeLock = null;

async function openNightlight() {
    const overlay = document.getElementById('nightlight_overlay');
    if (!overlay) return;
    overlay.style.display = 'block';

    try {
        if ('wakeLock' in navigator) {
            nlWakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (e) {}

    history.pushState({ nightlightOpen: true }, "");
}

function closeNightlight() {
    const overlay = document.getElementById('nightlight_overlay');
    if (overlay) overlay.style.display = 'none';

    if (nlWakeLock) {
        nlWakeLock.release().catch(() => {});
        nlWakeLock = null;
    }
}

function setNlColor(color, btn) {
    const overlay = document.getElementById('nightlight_overlay');
    if (overlay) overlay.style.backgroundColor = color;

    document.querySelectorAll('.nl-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.1)';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
    });
    if (btn) {
        btn.style.background = 'rgba(255,255,255,0.3)';
        btn.style.borderColor = '#fff';
    }
}