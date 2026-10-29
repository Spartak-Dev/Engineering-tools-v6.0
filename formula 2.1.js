// ============================================================================
// formula.js — Чиста інженерна логіка для Engineering Tools 6.0
// Повна підтримка: Li-ion, Si-C (Кремній-вуглець), LiFePO4, Lead-Acid (Свинець)
// ============================================================================

// ============================================================================
// 1. БАЗА ДАНИХ ХІМІЙ — ЄДИНЕ ДЖЕРЕЛО ІСТИНИ
// ============================================================================
const CHEMISTRY = {
    lithium: {
        label:        'Li-ion',
        vNom:         3.7,
        vMax:         4.2,
        vMin:         2.5,
        dod:          1.00,
        dodSafe:      0.80,
        effCharge:    0.85,
        effDischarge: 0.85,
        cvStart:      80,
        tempMaxC:     45
    },
    sic: {
        label:        'Si-C (Кремній-вуглецевий)',
        vNom:         3.8,
        vMax:         4.45,
        vMin:         3.0,
        dod:          0.88,
        dodSafe:      0.75,
        effCharge:    0.90,
        effDischarge: 0.90,
        cvStart:      75,
        tempMaxC:     45
    },
    lifepo4: {
        label:        'LiFePO4',
        vNom:         3.2,
        vMax:         3.65,
        vMin:         2.5,
        dod:          0.90,
        dodSafe:      0.85,
        effCharge:    0.95,
        effDischarge: 0.90,
        cvStart:      90,
        tempMaxC:     60
    },
    lead_acid: {
        label:        'Свинцевий (AGM/GEL)',
        vNom:         12.0,
        vMax:         14.4,
        vMin:         10.5,
        dod:          0.50,
        dodSafe:      0.30,
        effCharge:    0.70,
        effDischarge: 0.80,
        cvStart:      70,
        tempMaxC:     40
    }
};

// Хелпер отримання параметрів хімії
function chem(type) {
    return CHEMISTRY[type] || CHEMISTRY.lithium;
}

// ============================================================================
// 2. ЗВОРОТНА СУМІСНІСТЬ З ІСНУЮЧИМ UI
// ============================================================================
const NOMINAL_VOLTAGE = {
    LI_ION:    CHEMISTRY.lithium.vNom,
    LIFEPO4:   CHEMISTRY.lifepo4.vNom,
    LEAD_ACID: CHEMISTRY.lead_acid.vNom,
    SIC:       CHEMISTRY.sic.vNom
};

const EFFICIENCY = {
    CHARGE_LI_ION:      CHEMISTRY.lithium.effCharge,
    CHARGE_LIFEPO4:     CHEMISTRY.lifepo4.effCharge,
    CHARGE_LEAD_ACID:   CHEMISTRY.lead_acid.effCharge,
    CHARGE_SIC:         CHEMISTRY.sic.effCharge,
    DISCHARGE_LI_ION:   CHEMISTRY.lithium.effDischarge,
    DISCHARGE_SIC:      CHEMISTRY.sic.effDischarge,
    SYSTEM_LIFEPO4:     CHEMISTRY.lifepo4.effDischarge,
    SYSTEM_SIC:         CHEMISTRY.sic.effDischarge,
    SYSTEM_LEAD_ACID:   CHEMISTRY.lead_acid.effDischarge,
    SOLAR_SYSTEM:       0.75,
    FLASHLIGHT_DRIVER:  0.85
};

const CCCV_FACTORS = {
    NORMAL:     1.0,
    ABOVE_80:   0.70,
    ABOVE_90:   0.35,
    CV_PENALTY: 1.50
};

const CHARGE_PENALTY = {
    lithium:   1.30,
    sic:       1.20,
    lifepo4:   1.15,
    lead_acid: 1.40
};

// ============================================================================
// 3. КОНВЕРТАЦІЯ ЄМНОСТІ
// ============================================================================

function mahToWh(mah, voltage = CHEMISTRY.lithium.vNom) {
    return (Number(mah) / 1000) * voltage;
}

function ahToWh(ah, voltage) {
    return Number(ah) * voltage;
}

/**
 * Універсальне обчислення Wh.
 * Враховує передану напругу (voltage) навіть для mAh (наприклад, для збірок 12V LiFePO4).
 */
function getCapacityWh({ type = 'lithium', unit = 'mah', value = 0, voltage = null }) {
    const v = Number(value);
    if (unit === 'wh') return v;

    const c = chem(type);

    if (type === 'lead_acid' && unit === 'ah') {
        if (!voltage || voltage <= 0) return NaN;
        return ahToWh(v, voltage);
    }

    if (type === 'lifepo4' && unit === 'ah') {
        return ahToWh(v, voltage || 12.8);
    }

    if (unit === 'mah') {
        const effectiveV = (voltage && voltage > 0) ? voltage : c.vNom;
        return (v / 1000) * effectiveV;
    }

    if (unit === 'ah') {
        return ahToWh(v, (voltage && voltage > 0) ? voltage : c.vNom);
    }

    return NaN;
}

// ============================================================================
// 4. ККД ТА DoD
// ============================================================================

function getChargeEfficiency(type)    { return chem(type).effCharge;    }
function getDischargeEfficiency(type) { return chem(type).effDischarge; }
function getSystemEfficiency(type)    { return chem(type).effDischarge; }

function getDoD(type, safe = false) {
    const c = chem(type);
    return safe ? c.dodSafe : c.dod;
}

// ============================================================================
// 5. ЧАСОВІ РОЗРАХУНКИ ТА АЛГОРИТМИ РОБОТИ
// ============================================================================

function calculateSimpleTime(wh, watts) {
    if (!watts || watts <= 0) return 0;
    return (wh / watts) * 60;
}

/**
 * Кнопка 1 — Час зарядки ПБ (Динаміка)
 */
function calculatePowerbankChargeTime(wh, watts, startPercent, type = 'lithium') {
    const c = chem(type);
    let totalMinutes = 0;
    for (let i = startPercent; i < 100; i++) {
        let phaseEff = watts * c.effCharge;
        if (i >= c.cvStart && i < 90) phaseEff *= CCCV_FACTORS.ABOVE_80;
        if (i >= 90)                  phaseEff *= CCCV_FACTORS.ABOVE_90;
        totalMinutes += ((wh / 100) / phaseEff) * 60;
    }
    return totalMinutes;
}

/**
 * Кнопка 2 — Час зарядки Li-ion / Si-C акумулятора
 */
function calculateLiIonChargeTime(wh, U, A, type = 'lithium') {
    const c = chem(type);
    const penalty = CHARGE_PENALTY[type] || CHARGE_PENALTY.lithium;
    const baseMins = (wh / (U * A * c.effCharge)) * 60;
    return baseMins * penalty;
}

/**
 * Кнопка 4 — Скільки було світло
 * [ВИПРАВЛЕНО]: ККД тепер МНОЖИТЬСЯ на енергію, а не ділить її.
 */
function calculateLightTime(capacityWh, percentStart, percentEnd, watts, type = 'lithium') {
    const deltaPercent = Math.abs(percentEnd - percentStart) / 100;
    const eff = chem(type).effDischarge;
    return ((capacityWh * deltaPercent * eff) / watts) * 60;
}

/**
 * Кнопка 6 — Ліхтарик
 */
function calculateFlashlightTime(whFull, percent, lumens, type = 'lithium') {
    const c = chem(type);
    const dod = c.dod;
    const eff = c.effDischarge;

    // DoD  це поріг знизу, а не множник
    const minPercent = (1 - dod) * 100;
    const usablePercent = Math.max(0, percent - minPercent);
    const wh = whFull * (usablePercent / 100) * eff;
    return (wh * EFFICIENCY.FLASHLIGHT_DRIVER / (lumens / 100)) * 60;
}

function getChipLumensPerWatt(chip) {
    return chip.maxLumens / chip.maxWatts;
}

function calculateFlashlightTimeFromChip(whFull, percent, userLumens, chip, driverEff, type = 'lithium') {
    const dod = getDoD(type);
    const minPercent = (1 - dod) * 100;
    const usablePercent = Math.max(0, percent - minPercent);
    const wh = whFull * (usablePercent / 100);

    const ratio = getChipLumensPerWatt(chip);
    const powerDraw = userLumens / ratio;
    return (wh * driverEff / powerDraw) * 60;
}

function calculateFlashlightTimeFromWatts(whFull, percent, watts, driverEff, type = 'lithium') {
    const dod = getDoD(type);
    const minPercent = (1 - dod) * 100;
    const usablePercent = Math.max(0, percent - minPercent);
    const wh = whFull * (usablePercent / 100);
    return (wh * driverEff / watts) * 60;
}

/**
 * Кнопка 7 — Режим виживання
 * Враховує захисний поріг розряду (DoD).
 */
function calculateSurvivalMaxPower(capacityWh, percent, hours, type = 'lithium') {
    const dod = getDoD(type);
    const eff = getDischargeEfficiency(type);
    
    // Енергія з урахуванням захисного порогу безпечного розряду
    const minPercent = (1 - dod) * 100;
    const usablePercent = Math.max(0, percent - minPercent);
    const availableWh = capacityWh * (usablePercent / 100) * eff;

    if (!hours || hours <= 0) return { availableWh, maxW: 0 };
    return { availableWh, maxW: availableWh / hours };
}

/**
 * Кнопка 9 — Home Backup
 */
// 🟢 ОНОВЛЕНА ФУНКЦІЯ ДЛЯ КНОПКИ 9 (Home Backup)
function calculateHomeBackupTime(capacityWh, totalW, type, currentPercent = 100) {
    const efficiency = getSystemEfficiency(type);
    const dod = getDoD(type); // 0.90 для LiFePO4, 0.50 для свинцю
    
    // Мінімальний безпечний поріг (10% для LiFePO4, 50% для свинцю)
    const minPercent = (1 - dod) * 100;
    const isCritical = currentPercent <= minPercent;

    // Скільки відсотків безпечно можна використати:
    const usablePercent = Math.max(0, currentPercent - minPercent);
    const usableWh = capacityWh * (usablePercent / 100) * efficiency;

    if (!totalW || totalW <= 0) return { usableWh, hours: 0, isCritical, minPercent };
    return { usableWh, hours: usableWh / totalW, isCritical, minPercent };
}

/**
 * Кнопка 10 — Регенерація
 */
function calculateRechargeTime(capacityWh, currentPercent, chargePower, type) {
    if (currentPercent >= 100) return { neededWh: 0, effectivePower: 0, hours: 0 };

    const neededWh = capacityWh * ((100 - currentPercent) / 100);
    const efficiency = getChargeEfficiency(type);
    const effectivePower = chargePower * efficiency;

    // Використовуємо ту саму CV-модель, що й Кнопка 1 — щоб обидві кнопки
    // давали однакову цифру для одного й того ж сценарію.
    const totalMinutes = calculatePowerbankChargeTime(
        capacityWh, chargePower, currentPercent, type
    );

    return { neededWh, effectivePower, hours: totalMinutes / 60 };
}

// ============================================================================
// 6. АУДИТ ЯКОСТІ ПБ (Кнопка 8) ТА РЕСУРС ЦИКЛІВ
// ============================================================================

function calculateAuditEfficiency(nominalWh, percentUsed, realWh) {
    const expectedWh = nominalWh * (percentUsed / 100);
    if (!expectedWh) return 0;
    return (realWh / expectedWh) * 100;
}

function calculateRealCapacity(realWh, percentUsed) {
    if (!percentUsed) return 0;
    return realWh / (percentUsed / 100);
}

function calculateRealCapacityMah(realCapacityWh, type = 'lithium') {
    const v = chem(type).vNom;
    return (realCapacityWh / v) * 1000;
}

function getQualityStatus(efficiency) {
    // 🟢 Захист від завищених цифр (якщо ввели пікові Вати замість середніх):
    if (efficiency > 105) {
        return { 
            icon: '⚠️', 
            text: 'Нереальний результат (ККД > 100%)! Ймовірно, вказано пікову потужність замість середньої. Для зарядки смартфонів вказуйте 7–9 W, або тестуйте через постійне навантаження (роутер 5W).' 
        };
    }
    if (efficiency < 70) return { icon: '⚠️', text: 'Низька якість!' };
    if (efficiency < 85) return { icon: '⚡', text: 'Середня якість' };
    return { icon: '✅', text: 'Хороша якість' };
}

const CYCLE_DATA = {
    lithium:   { base: 500,  refDoD: 1.00, k: 1.5 },
    sic:       { base: 800,  refDoD: 0.88, k: 1.4 },
    lifepo4:   { base: 3000, refDoD: 0.90, k: 1.8 },
    lead_acid: { base: 400,  refDoD: 0.50, k: 2.0 }
};

function estimateCycles(type, dod = null) {
    const c = chem(type);
    const data = CYCLE_DATA[type] || CYCLE_DATA.lithium;
    const useDoD = (dod === null) ? c.dodSafe : dod;
    if (useDoD <= 0) return 0;
    return Math.round(data.base * Math.pow(data.refDoD / useDoD, data.k));
}

function estimateLifetimeWh(type, capacityWh) {
    const dod = chem(type).dodSafe;
    const cycles = estimateCycles(type, dod);
    return cycles * capacityWh * dod;
}

// ============================================================================
// 7. СОНЯЧНА ГЕОМЕТРІЯ (Кнопка 11)
// ============================================================================

const SEASONAL_COEFFICIENTS = {
    '12': 0.25, '1': 0.25, '2': 0.55, '3': 0.55, '4': 0.85, '5': 0.85,
    '6': 1.00, '7': 1.00, '8': 0.80, '9': 0.80, '10': 0.45, '11': 0.45
};

function solarDeclination(dayOfYear) {
    return -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);
}

function solarHourAngle(hour) {
    return (hour - 12) * 15;
}

function solarAltitude(lat, decl, hourAngle) {
    const phi = lat * Math.PI / 180;
    const delta = decl * Math.PI / 180;
    const omega = hourAngle * Math.PI / 180;
    const sinAlpha = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(omega);
    return Math.asin(sinAlpha) * 180 / Math.PI;
}

/**
 * [ВИПРАВЛЕНО]: Азимут тепер бере участь у розрахунку кута падіння променів.
 */
function solarIrradiance(altitude, tilt, azimuth, seasonCoeff) {
    if (altitude <= 0) return 0;
    const alpha = altitude * Math.PI / 180;
    const beta = tilt * Math.PI / 180;
    const gamma = (azimuth || 0) * Math.PI / 180;

    // Косинус кута падіння променів на площину з урахуванням нахилу та азимута
    const cosIncidence = Math.sin(alpha) * Math.cos(beta) + Math.cos(alpha) * Math.sin(beta) * Math.cos(gamma);
    const incidenceFactor = Math.max(0, cosIncidence);

    return 1000 * incidenceFactor * seasonCoeff;
}

function getSeasonCoefficient(month) {
    return SEASONAL_COEFFICIENTS[String(month)] || 0.75;
}

function getDayOfYear(dateStr) {
    const date = new Date(dateStr);
    const start = new Date(date.getFullYear(), 0, 0);
    return Math.floor((date - start) / (1000 * 60 * 60 * 24));
}

function calculateSolarOfflineProfile({ lat, tilt, azimuth, date, totalPowerKw }) {
    const dayOfYear = getDayOfYear(date);
    const decl = solarDeclination(dayOfYear);
    const month = new Date(date).getMonth() + 1;
    const seasonCoeff = getSeasonCoefficient(month);
    const profile = [];

    for (let hour = 0; hour < 24; hour++) {
        const omega = solarHourAngle(hour);
        const altitude = solarAltitude(lat, decl, omega);
        const irradiance = solarIrradiance(altitude, tilt, azimuth, seasonCoeff);
        profile.push(Math.round(irradiance * totalPowerKw * EFFICIENCY.SOLAR_SYSTEM));
    }
    return profile;
}
// ============================================================================
// 12. ТЕОРІЯ ПОХИБОК (ERROR PROPAGATION)
// ============================================================================
// Метод розповсюдження похибок непрямих вимірювань (Error Propagation).
// Замість однієї цифри показуємо діапазон довіри: T ± ΔT (напр. 2 год 31 хв ± 15 хв)
//
// Базова формула: T = (E × DoD × η) / P
// Відносна похибка: δT = √[(ΔP/P)² + (ΔE/E)² + (Δη/η)² + (ΔDoD/DoD)²]
// Абсолютна похибка: ΔT = T × δT

const UNCERTAINTY = {
    REL_POWER:      0.06, // ±6% — динаміка навантаження (роутер/телефон міняють апетит)
    REL_CAPACITY:   0.04, // ±4% — заводський розкид та деградація АКБ
    REL_EFFICIENCY: 0.05, // ±5% — просідання ККД плати при падінні напруги батареї
    REL_DOD:        0.04  // ±4% — похибка оцінки заряду дешевими платами ПБ
};

/*const UNCERTAINTY = {
    REL_POWER:      0.05, // ±5% — потужність споживача (мережа, нагрів, піки)
    REL_CAPACITY:   0.03, // ±3% — ємність АКБ (похибка аудиту)
    REL_EFFICIENCY: 0.03, // ±3% — ККД перетворювача (плаває під навантаженням)
    REL_DOD:        0.02  // ±2% — індикатор заряду (похибка плати ПБ)
}; */

/** Загальна відносна похибка δT (частка 0..1). Очікувано ~0.07-0.08 */
function getRelativeUncertainty() {
    const u = UNCERTAINTY;
    return Math.sqrt(
        u.REL_POWER      ** 2 +
        u.REL_CAPACITY   ** 2 +
        u.REL_EFFICIENCY ** 2 +
        u.REL_DOD        ** 2
    );
}

/** Абсолютна похибка часу (у хвилинах): ΔT = T × δT */
function getUncertaintyMinutes(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return 0;
    return totalMinutes * getRelativeUncertainty();
}

/** Абсолютна похибка потужності (у W) для Кнопки 7 */
function getUncertaintyWatts(watts) {
    if (!watts || watts <= 0) return 0;
    return watts * UNCERTAINTY.REL_POWER; // ← × 0.06
}

/** Відсоток загальної похибки для показу в UI */
function getUncertaintyPercent() {
    return Math.round(getRelativeUncertainty() * 100);
}
// ============================================================================
// 13. ТЕОРІЯ ПОХИБОК ДЛЯ АУДИТУ (Кнопка 8)
// ============================================================================
// Похибка аудиту залежить від глибини розряду тесту:
// Δ% = ±2% на КОЖЕН край (p1, p2) → ΔpercentUsed = √(2² + 2²) ≈ 2.83 пункту.
// При глибокому тесті (50%) це дає ~5.7%, при короткому (15%) — ~19%.

const AUDIT_UNCERTAINTY = {
    REL_LOAD_W:     0.06, // ±6% — точність потужності навантаження
    REL_TIME:       0.02, // ±2% — таймер/годинник (люди зазвичай фіксують точно)
    REL_PERCENT_PB: 0.04, // ±4% — похибка цифрового індикатора заряду (на кожен край)
    REL_NOMINAL:    0.05  // ±5% — заводський допуск ємності
};

/*const AUDIT_UNCERTAINTY = {
    REL_LOAD_W:     0.05, // ±5% — точність вказаної потужності навантаження
    REL_TIME:       0.03, // ±3% — похибка вимірювання часу (ручне коло)
    REL_PERCENT_PB: 0.02, // ±2% — індикатор заряду ПБ (на кожен з p1, p2)
    REL_NOMINAL:    0.05  // ±5% — допуск заявленої ємності від виробника
}; */

/** Δ(realWh) / realWh для realWh = W × t */
function getRealWhUncertainty(realWh) {
    const rel = Math.sqrt(
        AUDIT_UNCERTAINTY.REL_LOAD_W ** 2 +
        AUDIT_UNCERTAINTY.REL_TIME   ** 2
    );
    return { rel, abs: realWh * rel };
}

/** Абсолютна похибка ΔpercentUsed у пунктах (%) = √(Δp1² + Δp2²) */
function getPercentUsedUncertainty() {
    const u = AUDIT_UNCERTAINTY.REL_PERCENT_PB * 100; // 2 пункти
    return Math.sqrt(u * u + u * u); // ≈ 2.83
}

/** Δ(realCapacityWh) / realCapacityWh для realCapacityWh = realWh / (percentUsed/100) */
function getRealCapacityUncertainty(realWh, percentUsed, realCapacityWh) {
    const { rel: relWh } = getRealWhUncertainty(realWh);
    const relPU = getPercentUsedUncertainty() / percentUsed;
    const rel = Math.sqrt(relWh ** 2 + relPU ** 2);
    return { rel, abs: realCapacityWh * rel };
}

/** Δ(efficiency) / efficiency у % (пунктах ККД) */
function getEfficiencyUncertainty(realWh, nominalWh, percentUsed, efficiency) {
    const { rel: relWh } = getRealWhUncertainty(realWh);
    const relPU = getPercentUsedUncertainty() / percentUsed;
    const rel = Math.sqrt(relWh ** 2 + AUDIT_UNCERTAINTY.REL_NOMINAL ** 2 + relPU ** 2);
    return { rel, abs: efficiency * rel };
}
