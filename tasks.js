// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyC7Pt1hH2AZTPmNW3XGLpgJWa4US0P3RoE",
    authDomain: "taskswave.firebaseapp.com",
    projectId: "taskswave",
    storageBucket: "taskswave.firebasestorage.app",
    messagingSenderId: "91401216844",
    appId: "1:91401216844:web:257dcd0daa86fa6306e5e9",
    measurementId: "G-8R3HV9YQTL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== CLOUDINARY CONFIGURATION =====
const CLOUDINARY_CLOUD_NAME = 'dxvbmif9b';
const CLOUDINARY_UPLOAD_PRESET = 'submissions';

// ===== STATE =====
let currentUser = null;
let userRole = null;
let allTasks = [];
let userSubmissions = [];
let currentTask = null;
let selectedFile = null;

// ===== DOM ELEMENTS =====
const loadingOverlay = document.getElementById('loading-overlay');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const statusFilter = document.getElementById('status-filter');
const platformFilter = document.getElementById('platform-filter');
const searchInput = document.getElementById('search-input');
const tasksTableBody = document.getElementById('tasks-table-body');
const submitModal = document.getElementById('submit-modal');
const closeModal = document.getElementById('close-modal');
const cancelSubmit = document.getElementById('cancel-submit');
const confirmSubmit = document.getElementById('confirm-submit');
const fileUpload = document.getElementById('file-upload');
const screenshotInput = document.getElementById('screenshot-input');
const fileName = document.getElementById('file-name');
const screenshotGroup = document.getElementById('screenshot-group');

// ===== UTILITY FUNCTIONS =====
function showLoading(text = 'Loading...') {
    document.getElementById('loading-text').textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

/*function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}*/

function formatNumber(num) {
    if (num === undefined || num === null) return "0";
    return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getInitials(name) {
    if (!name) return '--';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const platformIcons = {
    tiktok: { icon: 'fab fa-tiktok', class: 'tiktok', name: 'TikTok' },
    instagram: { icon: 'fab fa-instagram', class: 'instagram', name: 'Instagram' },
    facebook: { icon: 'fab fa-facebook-f', class: 'facebook', name: 'Facebook' },
    youtube: { icon: 'fab fa-youtube', class: 'youtube', name: 'YouTube' },
    telegram: { icon: 'fab fa-telegram', class: 'telegram', name: 'Telegram' },
    whatsapp: { icon: 'fab fa-whatsapp', class: 'whatsapp', name: 'WhatsApp' },
    twitter: { icon: 'fab fa-twitter', class: 'twitter', name: 'Twitter' },
    website: { icon: 'fa-solid fa-globe', class: 'instagram', name: 'Website' },
    linkedin: { icon: 'fab fa-linkedin-in', class: 'linkedin', name: 'LinkedIn' }
};

// ===== DARK MODE =====
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

// ===== SIDEBAR TOGGLE (ADMIN ONLY) =====
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// ===== FETCH USER DATA =====
async function fetchUserData(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        userRole = userData.role || 'user';

        // Show menu toggle only for admin
        if (userRole === 'admin') {
            menuToggle.classList.add('show');
        }

        document.getElementById('username').textContent = userData.username || 'User';
        document.getElementById('user-avatar').textContent = getInitials(userData.username);
        document.getElementById('user-balance').textContent = formatNumber(userData.balance || 0);
    }
}

// ===== FETCH TASKS =====
async function fetchTasks() {
    try {
        const tasksSnapshot = await db.collection('tasks')
            .where('status', '==', 'active')
            .get();

        allTasks = tasksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderTasks();
        updateStats();
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// ===== FETCH USER SUBMISSIONS =====
async function fetchUserSubmissions(userId) {
    try {
        const submissionsSnapshot = await db.collection('submissions')
            .where('userId', '==', userId)
            .get();

        userSubmissions = submissionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        updateStats();
        renderTasks();
    } catch (error) {
        console.error('Error fetching submissions:', error);
    }
}

// ===== UPDATE STATS =====
// GYARA: Available Tasks yana nuna kawai tasks da wannan user bai submit ba
function updateStats() {
    const submittedTaskIds = userSubmissions.map(s => s.taskId);
    const availableForUser = allTasks.filter(task =>
        !submittedTaskIds.includes(task.id)
    ).length;

    document.getElementById('total-tasks').textContent = availableForUser;

    const completed = userSubmissions.filter(s => s.status === 'approved').length;
    document.getElementById('completed-tasks').textContent = completed;

    const earnings = userSubmissions
        .filter(s => s.status === 'approved')
        .reduce((sum, s) => sum + (s.amount || 0), 0);
    document.getElementById('total-earnings').textContent = formatNumber(earnings);
}

// ===== RENDER TASKS =====
function renderTasks() {
    const statusValue = statusFilter.value;
    const platformValue = platformFilter.value;
    const searchValue = searchInput.value.toLowerCase();

    let filteredTasks = [];

    if (statusValue === 'available') {
        const submittedTaskIds = userSubmissions.map(s => s.taskId);
        filteredTasks = allTasks.filter(task => {
            const notSubmitted = !submittedTaskIds.includes(task.id);
            const matchesPlatform = !platformValue || task.platform === platformValue;
            const matchesSearch = !searchValue ||
                task.title.toLowerCase().includes(searchValue) ||
                task.description.toLowerCase().includes(searchValue);
            return notSubmitted && matchesPlatform && matchesSearch;
        });
    } else if (statusValue === 'pending') {
        const pendingSubmissions = userSubmissions.filter(s => s.status === 'pending');
        const pendingTaskIds = pendingSubmissions.map(s => s.taskId);
        filteredTasks = allTasks.filter(task => {
            const isPending = pendingTaskIds.includes(task.id);
            const matchesPlatform = !platformValue || task.platform === platformValue;
            const matchesSearch = !searchValue ||
                task.title.toLowerCase().includes(searchValue) ||
                task.description.toLowerCase().includes(searchValue);
            return isPending && matchesPlatform && matchesSearch;
        });
    } else if (statusValue === 'approved') {
        const approvedSubmissions = userSubmissions.filter(s => s.status === 'approved');
        const approvedTaskIds = approvedSubmissions.map(s => s.taskId);
        filteredTasks = allTasks.filter(task => {
            const isApproved = approvedTaskIds.includes(task.id);
            const matchesPlatform = !platformValue || task.platform === platformValue;
            const matchesSearch = !searchValue ||
                task.title.toLowerCase().includes(searchValue) ||
                task.description.toLowerCase().includes(searchValue);
            return isApproved && matchesPlatform && matchesSearch;
        });
    } else if (statusValue === 'all') {
        const submittedTaskIds = userSubmissions.map(s => s.taskId);
        filteredTasks = allTasks.filter(task => {
            const isSubmitted = submittedTaskIds.includes(task.id);
            const matchesPlatform = !platformValue || task.platform === platformValue;
            const matchesSearch = !searchValue ||
                task.title.toLowerCase().includes(searchValue) ||
                task.description.toLowerCase().includes(searchValue);
            return isSubmitted && matchesPlatform && matchesSearch;
        });
    }

    tasksTableBody.innerHTML = '';

    if (filteredTasks.length === 0) {
        const emptyMessage = statusValue === 'available' ? 'No available tasks' :
            statusValue === 'pending' ? 'No pending tasks' :
            statusValue === 'approved' ? 'No approved tasks' :
            'No submitted tasks';

        tasksTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray);">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    ${emptyMessage}
                </td>
            </tr>
        `;
        return;
    }

    filteredTasks.forEach((task, index) => {
        const platform = platformIcons[task.platform] || {
            icon: 'fas fa-globe',
            class: 'instagram',
            name: task.platform
        };
        const percentage = task.participations > 0
            ? Math.round((task.currentSubmissions / task.participations) * 100)
            : 0;

        const userSubmission = userSubmissions.find(s => s.taskId === task.id);
        const submissionStatus = userSubmission ? userSubmission.status : null;

        // Determine button text and state
        let buttonText = 'Submit';
        let buttonClass = '';
        let buttonDisabled = false;
        let buttonIcon = 'paper-plane';

        if (statusValue === 'available') {
            buttonText = 'Submit';
            buttonClass = '';
            buttonDisabled = task.currentSubmissions >= task.participations;
            buttonIcon = 'paper-plane';
        } else {
            if (submissionStatus === 'pending') {
                buttonText = 'Pending';
                buttonClass = 'completed';
                buttonDisabled = true;
                buttonIcon = 'clock';
            } else if (submissionStatus === 'approved') {
                buttonText = 'Approved';
                buttonClass = 'completed';
                buttonDisabled = true;
                buttonIcon = 'check';
            } else if (submissionStatus === 'rejected') {
                buttonText = 'Rejected';
                buttonClass = '';
                buttonDisabled = true;
                buttonIcon = 'times';
            }
        }

        const row = document.createElement('tr');

        // GYARA: Amfani da data-task-id maimakon onclick string - yana hana string error
        row.innerHTML = `
            <td class="sn-column">${index + 1}</td>
            <td>
                <div class="platform-cell">
                    <div class="platform-icon-small ${platform.class}">
                        <i class="${platform.icon}"></i>
                    </div>
                    <span style="font-weight: 600;">${platform.name}</span>
                </div>
            </td>
            <td>
                <div class="task-title">${task.title}</div>
                <div class="task-description">${task.description}</div>
            </td>
            <td>
                <div class="task-link">
                    <a href="${task.link}" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-external-link-alt"></i>
                        Open
                    </a>
                </div>
            </td>
            <td class="price-cell">&#8358;${formatNumber(task.pricePerParticipation)}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-info">
                        <span class="progress-numbers">${task.currentSubmissions}/${task.participations}</span>
                        <span class="progress-percentage">${percentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            </td>
            <td>
                <span class="screenshot-badge ${task.screenshotRequired ? 'screenshot-yes' : 'screenshot-no'}">
                    <i class="fas fa-${task.screenshotRequired ? 'camera' : 'times'}"></i>
                    ${task.screenshotRequired ? 'Required' : 'Not Required'}
                </span>
            </td>
            <td>
                <button 
                    class="action-btn ${buttonClass}"
                    data-task-id="${task.id}"
                    ${buttonDisabled ? 'disabled' : ''}>
                    <i class="fas fa-${buttonIcon}"></i>
                    ${buttonText}
                </button>
            </td>
        `;

        tasksTableBody.appendChild(row);

        // GYARA: Sanya event listener kai tsaye akan button - mafi aminci fiye da onclick string
        const btn = row.querySelector('.action-btn:not([disabled])');
        if (btn) {
            btn.addEventListener('click', () => {
                openSubmitModal(btn.dataset.taskId);
            });
        }
    });
}

// ===== OPEN SUBMIT MODAL =====
function openSubmitModal(taskId) {
    currentTask = allTasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const platform = platformIcons[currentTask.platform] || {
        name: currentTask.platform
    };
    document.getElementById('modal-task-title').textContent = currentTask.title;
    document.getElementById('modal-platform').textContent = platform.name;
    document.getElementById('modal-price').textContent = formatNumber(currentTask.pricePerParticipation);

    // Show/hide screenshot upload based on task requirement
    if (currentTask.screenshotRequired) {
        screenshotGroup.style.display = 'block';
        screenshotInput.required = true;
    } else {
        screenshotGroup.style.display = 'none';
        screenshotInput.required = false;
    }

    // Reset form
    document.getElementById('submit-form').reset();
    selectedFile = null;
    fileName.textContent = '';

    submitModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ===== CLOSE MODAL =====
function closeSubmitModal() {
    submitModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

closeModal.addEventListener('click', closeSubmitModal);
cancelSubmit.addEventListener('click', closeSubmitModal);

// Close modal when clicking outside
submitModal.addEventListener('click', (e) => {
    if (e.target === submitModal) {
        closeSubmitModal();
    }
});

// ===== FILE UPLOAD =====
fileUpload.addEventListener('click', () => {
    screenshotInput.click();
});

screenshotInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            screenshotInput.value = '';
            return;
        }
        selectedFile = file;
        fileName.textContent = `Selected: ${file.name}`;
    }
});

// ===== UPLOAD TO CLOUDINARY =====
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'taskwave/screenshots');

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error('Failed to upload to Cloudinary');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

// ===== SUBMIT TASK =====
confirmSubmit.addEventListener('click', async () => {
    if (!currentUser) {
        alert('Please login first');
        return;
    }

    const userHandle = document.getElementById('user-handle').value.trim();
    const notes = document.getElementById('task-notes').value.trim();

    if (!userHandle) {
        alert('Please enter your username/handle');
        return;
    }

    if (currentTask.screenshotRequired && !selectedFile) {
        alert('Please upload a screenshot');
        return;
    }

    try {
        showLoading('Submitting task...');
        confirmSubmit.disabled = true;

        let screenshotUrl = null;

        // Upload screenshot to Cloudinary if required
        if (currentTask.screenshotRequired && selectedFile) {
            showLoading('Uploading screenshot...');
            screenshotUrl = await uploadToCloudinary(selectedFile);
        }

        showLoading('Saving submission...');

        // Create submission in Firestore
        const submissionData = {
            taskId: currentTask.id,
            userId: currentUser.uid,
            taskTitle: currentTask.title,
            platform: currentTask.platform,
            amount: currentTask.pricePerParticipation,
            userHandle: userHandle,
            notes: notes,
            screenshotUrl: screenshotUrl,
            status: 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('submissions').add(submissionData);

        // Update task currentSubmissions count
        await db.collection('tasks').doc(currentTask.id).update({
            currentSubmissions: firebase.firestore.FieldValue.increment(1)
        });

        hideLoading();
        alert('Task submitted successfully! Wait for approval.');
        closeSubmitModal();

        // Refresh all data
        await fetchTasks();
        await fetchUserSubmissions(currentUser.uid);

    } catch (error) {
        console.error('Error submitting task:', error);
        hideLoading();
        alert('Error submitting task: ' + error.message);
    } finally {
        confirmSubmit.disabled = false;
    }
});

// ===== FILTERS =====
statusFilter.addEventListener('change', renderTasks);
platformFilter.addEventListener('change', renderTasks);
searchInput.addEventListener('input', renderTasks);

// ===== AUTH STATE =====
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        showLoading('Loading your tasks...');

        await fetchUserData(user.uid);
        await fetchTasks();
        await fetchUserSubmissions(currentUser.uid);

        hideLoading();
    } else {
        alert('Please login to view tasks');
        window.location.href = 'index.html';
    }
});

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
});

