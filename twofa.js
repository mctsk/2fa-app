const fs = require('fs')
const os = require('os')
const { TOTP } = require('totp-generator')
const QRCode = require('qrcode')
const Sortable = require('sortablejs')
const storage = require('electron-json-storage');
const path = require('path');

// Storage setup
storage.setDataPath(os.homedir());

let allData = { entries: [] };
let remainSeconds = 0;
// No global editActive needed for new design
let sortableInstance;

document.addEventListener('DOMContentLoaded', function () {
    // Theme initialization
    initTheme();

    // Event Listeners
    setupEventListeners();

    // Initialize Sortable
    initSortable();

    // Load Data
    getStorage();

    // Start Timer
    startTimer();
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    const icon = btn.querySelector('.material-icons');
    // If current is dark, show sun (to switch to light). If light, show moon (to switch to dark).
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function initSortable() {
    const el = document.getElementById('account-list');
    sortableInstance = Sortable.create(el, {
        animation: 150,
        handle: '.account-card', // Drag by whole card
        onEnd: function (evt) {
            updateQueue();
        }
    });
}

function updateQueue() {
    const cards = document.querySelectorAll('.account-card');
    cards.forEach((card, index) => {
        const id = card.getAttribute('data-id');
        const entry = allData.entries.find(x => x.id == id);
        if (entry) {
            entry.queue = index;
        }
    });
    setStorage();
}

function getStorage() {
    storage.get('userData', function (error, data) {
        if (error) console.error(error);

        if (data && data.entries) {
            allData = data;
        } else {
            // Fallback to local file if exists (migration path)
            const filePath = path.join(__dirname, 'data.json');
            try {
                if (fs.existsSync(filePath)) {
                    const localData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    if (localData && localData.entries) {
                        allData = localData;
                        setStorage(); // Migrate to electron-storage
                    }
                }
            } catch (e) {
                console.log("No local data found or error reading it");
            }
        }

        // Initial Render
        renderAccounts();
    });
}

function setStorage() {
    storage.set('userData', allData, function (error) {
        if (error) console.error("Error saving:", error);
    });
}

function renderAccounts() {
    const list = document.getElementById('account-list');
    list.innerHTML = '';

    if (!allData.entries) return;

    // Sort by queue
    allData.entries.sort((a, b) => (a.queue || 0) - (b.queue || 0));

    const now = Date.now();

    allData.entries.forEach(entry => {
        // Generate OTP
        let otp = '000000';
        let expires = Date.now() + 30000;
        try {
            // Clean secret (remove spaces, convert to uppercase)
            const cleanSecret = (entry.info.secret || '').replace(/\s/g, '').toUpperCase();

            // Map algorithm names to what library expects (SHA1 -> SHA-1)
            let algo = entry.info.algo || "SHA-1";
            if (algo === "SHA1") algo = "SHA-1";
            if (algo === "SHA256") algo = "SHA-256";
            if (algo === "SHA512") algo = "SHA-512";

            const result = TOTP.generate(cleanSecret, {
                digits: entry.info.digits || 6,
                period: entry.info.period || 30,
                timestamp: now,
                algorithm: algo
            });
            otp = result.otp;
            expires = result.expires;
        } catch (e) {
            console.error("Error generating OTP for", entry.name, e);
            otp = 'ERROR';
        }

        // Format OTP (123 456)
        const formattedOtp = otp.length === 6 ? `${otp.slice(0, 3)} ${otp.slice(3)}` : otp;

        // Determine Icon
        let iconHtml = '';
        if (entry.iconUrl) {
            // Use custom URL if present
            iconHtml = `<div class="issuer-icon" style="background-color: transparent;"><img src="${entry.iconUrl}" alt="${entry.name}" onError="this.style.display='none';this.parentNode.classList.add('default');this.parentNode.innerText='${entry.name[0]}'"></div>`;
        } else {
            // Fallback to default letter if no URL
            iconHtml = `<div class="issuer-icon default">${entry.name[0]}</div>`;
        }

        const li = document.createElement('li');
        li.className = 'account-card';
        li.setAttribute('data-id', entry.id);
        // Store period and expires for timer updates
        const period = entry.info.period || 30;
        li.setAttribute('data-period', period);
        li.setAttribute('data-expires', expires);

        li.innerHTML = `
            <div class="card-header">
                ${iconHtml}
                <div class="account-info">
                    <h3 class="issuer-name">${entry.name}</h3>
                    <p class="account-name">${entry.issuer || entry.name}</p>
                </div>
            </div>
            <div class="otp-code" data-raw="${otp}">${formattedOtp}</div>
            <div class="timer-container">
                <div class="timer-bar" style="width: 100%;"></div>
            </div>
            <div class="card-actions">
                <button class="icon-btn edit-btn" title="Düzenle"><i class="material-icons" style="font-size:18px;">edit</i></button>
                <button class="icon-btn delete-btn" title="Sil"><i class="material-icons" style="font-size:18px;color:var(--accent-red);">delete</i></button>
            </div>
        `;

        // Click to copy
        li.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // Don't copy if button clicked

            navigator.clipboard.writeText(otp).then(() => {
                showToast("Kopyalandı!");
            }).catch(err => {
                console.error("Copy failed", err);
            });
        });

        // Edit/Delete handlers
        li.querySelector('.edit-btn').addEventListener('click', () => openAddModal(entry.id));
        li.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(entry.id));

        list.appendChild(li);
    });

    // Initial timer UI update
    updateTimerLogic(true);
}

function startTimer() {
    updateTimerLogic(); // Run immediately
    setInterval(() => {
        updateTimerLogic();
    }, 1000);
}

function updateTimerLogic(onlyUI = false) {
    const nowMs = Date.now();

    // Check if any card has expired
    const cards = document.querySelectorAll('.account-card');
    let needsRefresh = false;

    cards.forEach(card => {
        const expires = parseInt(card.getAttribute('data-expires') || '0');
        if (nowMs >= expires) {
            needsRefresh = true;
        }
    });

    if (!onlyUI && (needsRefresh || cards.length === 0)) {
        renderAccounts();
        return;
    }

    updateTimerUI(nowMs);
}

function updateTimerUI(nowMs = null) {
    if (!nowMs) nowMs = Date.now();

    const cards = document.querySelectorAll('.account-card');
    cards.forEach(card => {
        const bar = card.querySelector('.timer-bar');
        const period = parseInt(card.getAttribute('data-period') || 30);
        const expires = parseInt(card.getAttribute('data-expires') || '0');

        const remainMs = Math.max(0, expires - nowMs);
        const totalMs = period * 1000;

        const width = (remainMs / totalMs) * 100;

        if (bar) {
            bar.style.width = `${width}%`;
            if (remainMs <= 5000) {
                bar.classList.add('critical');
            } else {
                bar.classList.remove('critical');
            }
        }
    });
}

// Modal Logic
function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function openAddModal(editId = null) {
    const modal = document.getElementById('addNewModal');
    const title = document.getElementById('modalTitle');
    const nameInput = document.getElementById('name');
    const secretInput = document.getElementById('secret');
    const iconUrlInput = document.getElementById('icon-url');
    const saveBtn = document.getElementById('save-btn');

    // Reset fields
    nameInput.value = '';
    secretInput.value = '';
    iconUrlInput.value = '';
    modal.setAttribute('data-edit-id', '');

    if (editId) {
        title.innerText = 'Düzenle';
        const entry = allData.entries.find(x => x.id == editId);
        if (entry) {
            nameInput.value = entry.name;
            secretInput.value = entry.info.secret;
            iconUrlInput.value = entry.iconUrl || '';
            modal.setAttribute('data-edit-id', editId);

            // Generate QR Code for existing entries
            generateQRCode(entry.info.secret, entry.name, entry.issuer || entry.name);
        }
    } else {
        title.innerText = 'Yeni Ekle';
        document.getElementById('qr-container').style.display = 'none';
    }

    openModal('addNewModal');

    // One-time listener setup or re-create to avoid duplicates? 
    // Best to have a single listener that checks state, doing that in setupEventListeners
}

function openDeleteModal(id) {
    const modal = document.getElementById('deleteModal');
    modal.setAttribute('data-delete-id', id);
    openModal('deleteModal');
}

function setupEventListeners() {
    // Add Button
    document.getElementById('add-btn').addEventListener('click', () => openAddModal());

    // Close buttons
    document.querySelectorAll('.js-modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.custom-modal').id);
        });
    });

    // Save Button
    document.getElementById('save-btn').addEventListener('click', () => {
        const modal = document.getElementById('addNewModal');
        const editId = modal.getAttribute('data-edit-id');
        const name = document.getElementById('name').value;
        const secret = document.getElementById('secret').value;
        const iconUrl = document.getElementById('icon-url').value;

        if (!name || !secret) {
            alert('Lütfen isim ve secret alanlarını doldurun.');
            return;
        }

        if (editId) {
            // Edit
            const entry = allData.entries.find(x => x.id == editId);
            if (entry) {
                entry.name = name;
                entry.info.secret = secret;
                entry.iconUrl = iconUrl;
                delete entry.icon; // Remove legacy field if exists
            }
        } else {
            // Add
            const newEntry = {
                id: Date.now().toString(), // String ID is safer
                name: name,
                issuer: name,
                iconUrl: iconUrl,
                info: {
                    secret: secret,
                    algo: "SHA1",
                    digits: 6,
                    period: 30
                },
                queue: allData.entries.length
            };
            allData.entries.push(newEntry);
        }

        setStorage();
        renderAccounts();
        closeModal('addNewModal');
    });

    // Delete Confirm
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        const modal = document.getElementById('deleteModal');
        const id = modal.getAttribute('data-delete-id');

        allData.entries = allData.entries.filter(x => x.id != id);
        setStorage();
        renderAccounts();
        closeModal('deleteModal');
    });
}

async function generateQRCode(secret, name, issuer) {
    const qrContainer = document.getElementById('qr-container');
    const canvas = document.getElementById('qr-canvas');

    if (!secret) {
        qrContainer.style.display = 'none';
        return;
    }

    try {
        // Construct otpauth URI
        // otpauth://totp/Issuer:AccountName?secret=SECRET&issuer=Issuer
        const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
        const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(name)}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}`;

        await QRCode.toCanvas(canvas, uri, {
            width: 180,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        qrContainer.style.display = 'flex';
    } catch (err) {
        console.error('QR generation failed', err);
        qrContainer.style.display = 'none';
    }
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    if (window.toastTimeout) clearTimeout(window.toastTimeout);

    window.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}