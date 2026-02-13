

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
        let currentUser = null;
        const loadingOverlay = document.getElementById('loading-overlay');

        const loadingText = document.getElementById('loading-text');

        const darkModeToggle = document.getElementById('dark-mode-toggle');

        const menuToggle = document.getElementById('menu-toggle');

        const sidebar = document.getElementById('sidebar');

        const sidebarOverlay = document.getElementById('sidebar-overlay');

        

        const withdrawStatus = document.getElementById('withdraw-status');

        const statusLabel = document.getElementById('status-label');

        const withdrawMin = document.getElementById('withdraw-min');

        const withdrawMax = document.getElementById('withdraw-max');

        const referralBonus = document.getElementById('referral-bonus');
const withdrawFeePercent = document.getElementById('withdraw-fee-percent');

        

        const withdrawForm = document.getElementById('withdraw-settings-form');

        const referralForm = document.getElementById('referral-bonus-form');

        const passwordForm = document.getElementById('change-password-form');
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
        function getInitials(name) {

            if (!name) return 'AD';

            const parts = name.split(' ');

            if (parts.length >= 2) {

                return (parts[0][0] + parts[1][0]).toUpperCase();

            }

            return name.substring(0, 2).toUpperCase();

        }
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
        menuToggle.addEventListener('click', () => {

            sidebar.classList.toggle('active');

            sidebarOverlay.classList.toggle('active');

        });
        sidebarOverlay.addEventListener('click', () => {

            sidebar.classList.remove('active');

            sidebarOverlay.classList.remove('active');

        });
        withdrawStatus.addEventListener('change', () => {

            if (withdrawStatus.checked) {

                statusLabel.textContent = 'Open';

                statusLabel.className = 'status-text status-open';

            } else {

                statusLabel.textContent = 'Closed';

                statusLabel.className = 'status-text status-closed';

            }

        });
        window.togglePassword = function(inputId) {

            const input = document.getElementById(inputId);

            const icon = input.nextElementSibling.querySelector('i');

            

            if (input.type === 'password') {

                input.type = 'text';

                icon.className = 'fas fa-eye-slash';

            } else {

                input.type = 'password';

                icon.className = 'fas fa-eye';

            }

        };
        async function verifyAdmin(user) {

            try {

                const userDoc = await db.collection('users').doc(user.uid).get();

                

                if (!userDoc.exists || userDoc.data().role !== 'admin') {

                    alert('Access Denied! Admins only.');

                    window.location.href = 'dashboard.html';

                    return false;

                }
                const adminName = userDoc.data().username || 'Admin';

                document.getElementById('admin-name').textContent = adminName;

                document.getElementById('user-avatar').textContent = getInitials(adminName);

                return true;

            } catch (error) {

                console.error('Verification error:', error);

                alert('Error verifying access');

                return false;

            }

        }


// --- GYARA LOAD SETTINGS ---
async function loadSettings() {
    try {
        const withdrawDoc = await db.collection('settings').doc('withdraw').get();
        if (withdrawDoc.exists) {
            const data = withdrawDoc.data();
            withdrawStatus.checked = data.isOpen || false;
            withdrawMin.value = data.minimum || 0;
            withdrawMax.value = data.maximum || 0;
            
            // Sabon bangaren Fee %
            const currentFee = data.feePercent || 0;
            withdrawFeePercent.value = currentFee;
            document.getElementById('current-fee-percent').textContent = currentFee;

            document.getElementById('current-min').textContent = formatNumber(data.minimum || 0);
            document.getElementById('current-max').textContent = formatNumber(data.maximum || 0);
            document.getElementById('current-status').textContent = data.isOpen ? 'Open' : 'Closed';
            document.getElementById('current-status').style.color = data.isOpen ? 'var(--success-green)' : 'var(--error-red)';
            
            if (data.isOpen) {
                statusLabel.textContent = 'Open';
                statusLabel.className = 'status-text status-open';
            } else {
                statusLabel.textContent = 'Closed';
                statusLabel.className = 'status-text status-closed';
            }
        }
        
        // Load referral bonus... (ragowar code dinka)
        const generalDoc = await db.collection('settings').doc('general').get();
        if (generalDoc.exists) {
            const data = generalDoc.data();
            referralBonus.value = data.referralBonus || 0;
            document.getElementById('current-bonus').textContent = formatNumber(data.referralBonus || 0);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// --- GYARA SUBMIT WITHDRAW FORM ---
withdrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const minValue = parseInt(withdrawMin.value);
    const maxValue = parseInt(withdrawMax.value);
    const feeValue = parseFloat(withdrawFeePercent.value) || 0; // Dauko fee %

    if (minValue >= maxValue) {
        alert('Minimum must be less than maximum!');
        return;
    }

    if (!confirm(`Update settings with ${feeValue}% fee?`)) return;

    try {
        showLoading('Saving withdrawal settings...');
        document.getElementById('save-withdraw-btn').disabled = true;

        await db.collection('settings').doc('withdraw').set({
            isOpen: withdrawStatus.checked,
            minimum: minValue,
            maximum: maxValue,
            feePercent: feeValue, // Adana shi a matsayin feePercent
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // Merge don kar ya goge wasu fields

        hideLoading();
        alert('Withdrawal settings updated successfully!');
        await loadSettings();
    } catch (error) {
        console.error('Error saving:', error);
        hideLoading();
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('save-withdraw-btn').disabled = false;
    }
});
        referralForm.addEventListener('submit', async (e) => {

            e.preventDefault();
            const bonusValue = parseInt(referralBonus.value);
            if (bonusValue < 0) {

                alert('Bonus amount must be positive!');

                return;

            }
            if (!confirm(`Set referral bonus to ₦${formatNumber(bonusValue)}?`)) return;
            try {

                showLoading('Saving referral bonus...');

                document.getElementById('save-bonus-btn').disabled = true;
                await db.collection('settings').doc('general').set({

                    referralBonus: bonusValue,

                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()

                }, { merge: true });
                hideLoading();

                alert('Referral bonus updated successfully!');

                await loadSettings();
            } catch (error) {

                console.error('Error saving:', error);

                hideLoading();

                alert('Error: ' + error.message);

            } finally {

                document.getElementById('save-bonus-btn').disabled = false;

            }

        });
        passwordForm.addEventListener('submit', async (e) => {

            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;

            const newPassword = document.getElementById('new-password').value;

            const confirmPassword = document.getElementById('confirm-password').value;
            if (newPassword.length < 6) {

                alert('New password must be at least 6 characters!');

                return;

            }
            if (newPassword !== confirmPassword) {

                alert('Passwords do not match!');

                return;

            }
            if (!confirm('Change your password?')) return;
            try {

                showLoading('Updating password...');

                document.getElementById('save-password-btn').disabled = true;
                const user = auth.currentUser;

                const credential = firebase.auth.EmailAuthProvider.credential(

                    user.email,

                    currentPassword

                );
                await user.reauthenticateWithCredential(credential);

                await user.updatePassword(newPassword);
                hideLoading();

                alert('Password updated successfully!');

                passwordForm.reset();
            } catch (error) {

                console.error('Error updating password:', error);

                hideLoading();

                

                if (error.code === 'auth/wrong-password') {

                    alert('Current password is incorrect!');

                } else if (error.code === 'auth/weak-password') {

                    alert('Password is too weak!');

                } else {

                    alert('Error: ' + error.message);

                }

            } finally {

                document.getElementById('save-password-btn').disabled = false;

            }

        });
        auth.onAuthStateChanged(async (user) => {

            if (user) {

                currentUser = user;

                showLoading('Loading settings...');

                const isAdmin = await verifyAdmin(user);

                if (isAdmin) {

                    await loadSettings();

                }

                

                hideLoading();

            } else {

                alert('Please login');

                window.location.href = 'index.html';

            }

        });
        document.addEventListener('DOMContentLoaded', () => {
            initDarkMode();

        });

