// ==========================================
// 1. DOM ELEMENTS SELECTION
// ==========================================
const darkModeToggle = document.getElementById('dark-mode-toggle');
const signinToggle = document.getElementById('signin-toggle');
const signupToggle = document.getElementById('signup-toggle');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToSignin = document.getElementById('switch-to-signin');
const signinBtn = document.getElementById('signin-btn');
const signupBtn = document.getElementById('signup-btn');

// Modal Elements
const successModal = document.getElementById('success-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// Password Toggles
const toggleSigninPassword = document.getElementById('toggle-signin-password');
const toggleSignupPassword = document.getElementById('toggle-signup-password');
const toggleSignupConfirmPassword = document.getElementById('toggle-signup-confirm-password');

// Remember Me Checkbox
const rememberMeCheckbox = document.getElementById('remember-me');

// ==========================================
// 2. UI & UX FEATURES (From Demo)
// ==========================================

// --- Dark Mode Logic ---
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

// Initialize Dark Mode
initDarkMode();

// --- Form Toggling Logic ---
function toggleForm(formToShow) {
    if (formToShow === 'signin') {
        signinToggle.classList.add('active');
        signupToggle.classList.remove('active');
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signupToggle.classList.add('active');
        signinToggle.classList.remove('active');
        signupForm.classList.add('active');
        signinForm.classList.remove('active');
    }
}

signinToggle.addEventListener('click', () => toggleForm('signin'));
signupToggle.addEventListener('click', () => toggleForm('signup'));
switchToSignup.addEventListener('click', (e) => { e.preventDefault(); toggleForm('signup'); });
switchToSignin.addEventListener('click', (e) => { e.preventDefault(); toggleForm('signin'); });

// --- Password Visibility Logic ---
function togglePasswordVisibility(inputId, toggleBtn) {
    const passwordInput = document.getElementById(inputId);
    const icon = toggleBtn.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

toggleSigninPassword.addEventListener('click', () => togglePasswordVisibility('signin-password', toggleSigninPassword));
toggleSignupPassword.addEventListener('click', () => togglePasswordVisibility('signup-password', toggleSignupPassword));
toggleSignupConfirmPassword.addEventListener('click', () => togglePasswordVisibility('signup-confirm-password', toggleSignupConfirmPassword));

// --- Helper Functions (Loading & Modal) ---
function showButtonLoading(button) {
    button.classList.add('loading');
}

function hideButtonLoading(button) {
    button.classList.remove('loading');
}

function showSuccessModal(title, message, redirectUrl = null) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    successModal.classList.add('active');
    
    // Set what happens when close button is clicked
    modalCloseBtn.onclick = function() {
        successModal.classList.remove('active');
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    };
}

// Close modal on outside click
successModal.addEventListener('click', function(e) {
    if (e.target === successModal) {
        successModal.classList.remove('active');
    }
});

// ==========================================
// 3. REMEMBER ME LOGIC (Local Storage)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const savedEmail = localStorage.getItem('taskwave_user_email');
    if (savedEmail) {
        document.getElementById('signin-email').value = savedEmail;
        rememberMeCheckbox.checked = true;
    }
});

// ==========================================
// 4. REFERRAL SYSTEM (URL Parsing)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
        const refInput = document.getElementById('signup-referredBy');
        if (refInput) {
            refInput.value = refCode;
            refInput.readOnly = true; // Make it uneditable
            
            // If referral exists, switch to signup view automatically
            toggleForm('signup');
        }
    }
});

// ==========================================
// 5. VALIDATION LOGIC (Restored from Demo)
// ==========================================
function validateSignupInputs() {
    const fullName = document.getElementById('signup-fullname').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    // Basic validation
    if (!fullName || !username || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return false;
    }
    
    // Password length validation
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return false;
    }
    
    // Password match validation
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return false;
    }
    
    return true;
}

function validateSigninInputs() {
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return false;
    }
    
    return true;
}

// ==========================================
// 6. FIREBASE BACKEND LOGIC
// ==========================================

// --- SIGN UP HANDLER ---
signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 1. Client-side Validation
    if (!validateSignupInputs()) return;
    
    showButtonLoading(signupBtn);

    const fullName = document.getElementById('signup-fullname').value;
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const referredBy = document.getElementById('signup-referredBy').value.trim();

    try {
        // 2. Check if Username is already taken in Firestore
        // Note: Assumes global 'db' from firebase-config.js
        const usernameQuery = await db.collection("users").where("username", "==", username).get();
        
        if (!usernameQuery.empty) {
            throw new Error("This username is already taken. Please choose another one.");
        }

        // 3. Create Authentication User
        // Note: Assumes global 'auth' from firebase-config.js
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 4. Fetch Referral Reward Amount from Settings
        let rewardAmount = 0;
        try {
            const settingsDoc = await db.collection("settings").doc("general").get();
            if (settingsDoc.exists) {
                rewardAmount = settingsDoc.data().referralBonus || 0;
            }
        } catch (err) {
            console.warn("Could not fetch settings:", err);
        }

        // 5. Save User Data to Firestor
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            fullname: fullName,
            username: username,
            email: email,
            referredBy: referredBy || null,
            balance: 0,
            referralEarnings: 0,
            referralsCount: 0,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 6. Process Referral Reward (if applicable)
        if (referredBy && rewardAmount > 0) {
            const referrerQuery = await db.collection("users").where("username", "==", referredBy).get();
            
            if (!referrerQuery.empty) {
                const referrerDoc = referrerQuery.docs[0];
                const referrerRef = db.collection("users").doc(referrerDoc.id);

                // Atomically increment balance and referral count
                await referrerRef.update({
                    balance: firebase.firestore.FieldValue.increment(rewardAmount),
                    referralEarnings: firebase.firestore.FieldValue.increment(rewardAmount),
                    referralsCount: firebase.firestore.FieldValue.increment(1)
                });
            }
        }

        hideButtonLoading(signupBtn);
        showSuccessModal('Account Created!', 'Your account has been successfully created.', 'dashboard.html');

    } catch (error) {
        hideButtonLoading(signupBtn);
        console.error("Signup Error:", error);
        
        let errorMessage = error.message;
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use.";
        }
        alert(errorMessage);
    }
});

// --- SIGN IN HANDLER ---
signinForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 1. Client-side Validation
    if (!validateSigninInputs()) return;
    
    showButtonLoading(signinBtn);

    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    try {
        // 2. Firebase Login
        await auth.signInWithEmailAndPassword(email, password);
        
        // 3. Handle "Remember Me"
        if (rememberMe) {
            localStorage.setItem('taskwave_user_email', email);
        } else {
            localStorage.removeItem('taskwave_user_email');
        }

        hideButtonLoading(signinBtn);
        
        // 4. Redirect
        // Optional: Show modal first or redirect immediately
        window.location.href = "dashboard.html";

    } catch (error) {
        hideButtonLoading(signinBtn);
        console.error("Login Error:", error);
        
        let errorMessage = "Invalid email or password.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Invalid email or password.";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "Access to this account has been temporarily disabled due to many failed login attempts.";
        }
        
        alert(errorMessage);
    }
});

// --- FORGOT PASSWORD HANDLER ---
document.querySelector('.forgot-password').addEventListener('click', async function(e) {
    e.preventDefault();
    
    const email = prompt('Please enter your email address to reset your password:');
    
    if (email) {
        // Simple email regex check before sending
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            await auth.sendPasswordResetEmail(email);
            showSuccessModal('Password Reset', `A password reset link has been sent to ${email}. Please check your inbox.`);
        } catch (error) {
            console.error("Reset Error:", error);
            alert("Failed to send reset email: " + error.message);
        }
    }
});
