
    // FIREBASE CONFIG
    const firebaseConfig = {
        apiKey: "AIzaSyC7Pt1hH2AZTPmNW3XGLpgJWa4US0P3RoE",
        authDomain: "taskswave.firebaseapp.com",
        projectId: "taskswave",
        storageBucket: "taskswave.firebasestorage.app",
        messagingSenderId: "91401216844",
        appId: "1:91401216844:web:257dcd0daa86fa6306e5e9",
        measurementId: "G-8R3HV9YQTL"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // STATE
    let currentUser = null;
    let userBalance = 0;
    let withdrawSettings = {
        isOpen: true,
        minimum: 1000,
        maximum: 50000,
        fee: 0 // Added fee to state
    };

    // DOM
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const withdrawForm = document.getElementById('withdraw-form');
    const statusAlert = document.getElementById('status-alert');
    const statusMessage = document.getElementById('status-message');
    const submitBtn = document.getElementById('submit-btn');
    const withdrawAmount = document.getElementById('withdraw-amount');
    const quickAmountBtns = document.querySelectorAll('.quick-amount-btn');
    const withdrawalsList = document.getElementById('withdrawals-list');

    // UTILITY
    function showLoading(text = 'Loading...') {
        loadingText.textContent = text;
        loadingOverlay.classList.remove('hidden');
    }
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function formatDate(timestamp) {
        if (!timestamp) return '--';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    function getInitials(name) {
        if (!name) return '--';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    // DARK MODE
    function initDarkMode() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.classList.add('active');
        }
    }
    darkModeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        darkModeToggle.classList.toggle('active', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode);
    });

    // FETCH WITHDRAW SETTINGS
    async function fetchWithdrawSettings() {
        try {
            const settingsDoc = await db.collection('settings').doc('withdraw').get();
            
            if (settingsDoc.exists) {
                // Hada asalin settings da sabon data harda "fee"
                withdrawSettings = { ...withdrawSettings, ...settingsDoc.data() };
            } else {
                withdrawSettings = {
                    isOpen: true,
                    minimum: 1000,
                    maximum: 50000,
                    fee: 0
                };
                await db.collection('settings').doc('withdraw').set(withdrawSettings);
            }
            updateSettingsUI();
        } catch (error) {
            console.error('Error fetching settings:', error);
            updateSettingsUI();
        }
    }

    // UPDATE SETTINGS UI
    function updateSettingsUI() {
        const { isOpen, minimum, maximum, fee } = withdrawSettings;
        
        document.getElementById('min-amount').textContent = formatNumber(minimum);
        document.getElementById('max-amount').textContent = formatNumber(maximum);
        document.getElementById('min-helper').textContent = formatNumber(minimum);
        document.getElementById('max-helper').textContent = formatNumber(maximum);

        withdrawAmount.min = minimum;
        withdrawAmount.max = maximum;

        if (isOpen) {
            statusAlert.className = 'status-alert alert-open';
            statusAlert.style.display = 'flex';
            statusMessage.textContent = `✓ Withdrawals are OPEN. (Charge: ₦${fee})`;
            submitBtn.disabled = false;
        } else {
            statusAlert.className = 'status-alert alert-closed';
            statusAlert.style.display = 'flex';
            statusMessage.textContent = '✗ Withdrawals are currently CLOSED. Please check back later.';
            submitBtn.disabled = true;
            withdrawForm.querySelectorAll('input, select').forEach(el => el.disabled = true);
        }
    }

    // FETCH USER DATA
    async function fetchUserData(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                userBalance = userData.balance || 0;
                
                document.getElementById('username').textContent = userData.username || 'User';
                document.getElementById('user-avatar').textContent = getInitials(userData.username);
                document.getElementById('header-balance').textContent = formatNumber(userBalance);
                document.getElementById('main-balance').textContent = formatNumber(userBalance);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }

    // FETCH USER WITHDRAWALS
    async function fetchUserWithdrawals(userId) {
        try {
            const withdrawalsSnapshot = await db.collection('withdrawals')
                .where('userId', '==', userId)
                .limit(5)
                .get();

            if (withdrawalsSnapshot.empty) {
                withdrawalsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No withdrawal history yet</p>
                    </div>
                `;
                return;
            }

            withdrawalsList.innerHTML = '';
            withdrawalsSnapshot.forEach(doc => {
                const withdrawal = doc.data();
                const item = document.createElement('div');
                item.className = 'withdrawal-item';
                item.innerHTML = `
                    <div class="withdrawal-header">
                        <div class="withdrawal-amount">₦${formatNumber(withdrawal.amount)}</div>
                        <div class="withdrawal-status status-${withdrawal.status}">
                            ${withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                        </div>
                    </div>
                    <div class="withdrawal-details">
                        <div class="withdrawal-detail">
                            <div class="detail-label">Bank</div>
                            <div class="detail-value">${withdrawal.bankName}</div>
                        </div>
                        <div class="withdrawal-detail">
                            <div class="detail-label">Account</div>
                            <div class="detail-value">${withdrawal.accountNumber}</div>
                        </div>
                        <div class="withdrawal-detail">
                            <div class="detail-label">Date</div>
                            <div class="detail-value">${formatDate(withdrawal.createdAt)}</div>
                        </div>
                    </div>
                `;
                withdrawalsList.appendChild(item);
            });
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
        }
    }

    // QUICK AMOUNT BUTTONS
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = btn.dataset.amount;
            withdrawAmount.value = amount;
        });
    });

    // SUBMIT WITHDRAWAL
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!withdrawSettings.isOpen) {
            alert('Withdrawals are currently closed.');
            return;
        }

        const amount = parseInt(withdrawAmount.value);
        const fee = parseInt(withdrawSettings.fee) || 0;
        const totalToDeduct = amount + fee;

        const bankName = document.getElementById('bank-name').value;
        const accountNumber = document.getElementById('account-number').value;
        const accountName = document.getElementById('account-name').value;

        // Validations
        if (amount < withdrawSettings.minimum) {
            alert(`Minimum withdrawal amount is ₦${formatNumber(withdrawSettings.minimum)}`);
            return;
        }
        if (amount > withdrawSettings.maximum) {
            alert(`Maximum withdrawal amount is ₦${formatNumber(withdrawSettings.maximum)}`);
            return;
        }
        if (totalToDeduct > userBalance) {
            alert(`Insufficient balance. Total needed: ₦${formatNumber(totalToDeduct)} (Amount + ₦${fee} fee)`);
            return;
        }
        if (accountNumber.length !== 10) {
            alert('Please enter a valid 10-digit account number');
            return;
        }

        if (!confirm(`Request withdrawal of ₦${formatNumber(amount)}? \nProcessing Fee: ₦${fee} \nTotal Deduction: ₦${formatNumber(totalToDeduct)}`)) {
            return;
        }

        try {
            showLoading('Processing withdrawal request...');
            submitBtn.disabled = true;

            const withdrawalData = {
                userId: currentUser.uid,
                username: document.getElementById('username').textContent,
                amount: amount,
                fee: fee,
                totalDeducted: totalToDeduct,
                bankName: bankName,
                accountNumber: accountNumber,
                accountName: accountName,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('withdrawals').add(withdrawalData);

            // Deduct total (Amount + Fee) from user balance
            await db.collection('users').doc(currentUser.uid).update({
                balance: firebase.firestore.FieldValue.increment(-totalToDeduct)
            });

            hideLoading();
            alert('Withdrawal request submitted successfully!');
            withdrawForm.reset();

            await fetchUserData(currentUser.uid);
            await fetchUserWithdrawals(currentUser.uid);
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            hideLoading();
            alert('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
        }
    });

    // AUTH
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            showLoading('Loading your account...');
            await fetchWithdrawSettings();
            await fetchUserData(user.uid);
            await fetchUserWithdrawals(user.uid);
            hideLoading();
        } else {
            alert('Please login to access withdrawals');
            window.location.href = '/login.html';
        }
    });

    // INIT
    document.addEventListener('DOMContentLoaded', () => {
        initDarkMode();
    });

