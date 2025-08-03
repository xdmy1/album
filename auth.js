// auth.js - PIN Authentication System with Supabase Backend

// Import Supabase auth functions - assuming they're loaded from supabase.js
// These functions will be available after import in index.html

// User roles
const ROLES = {
    GUEST: 'guest',     // Not authenticated
    VIEWER: 'viewer',   // Can view photos
    PARENT: 'parent'    // Can view + upload + manage
};

// Current user state
let currentUser = {
    role: ROLES.GUEST,
    authenticated: false,
    timestamp: null,
    userId: null,
    sessionId: null
};

// Initialize auth system
async function initAuth() {
    console.log('🔐 Initializing auth system...');
    
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem('familyapp_session');
    
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            const now = Date.now();
            
            console.log('📄 Found saved session, validating with Supabase...');
            
            // Verify session with Supabase
            if (window.verifySession && session.sessionId) {
                const result = await window.verifySession(session.sessionId);
                
                if (result.valid) {
                    console.log('✅ Valid session confirmed by Supabase');
                    
                    // Update user state with verified data
                    currentUser = {
                        role: result.role,
                        authenticated: true,
                        timestamp: now,
                        userId: result.userId,
                        sessionId: session.sessionId
                    };
                    
                    // Save updated session (to refresh timestamp)
                    localStorage.setItem('familyapp_session', JSON.stringify(currentUser));
                    return true;
                } else {
                    console.log('⏰ Session invalid or expired, clearing...');
                    clearSession();
                }
            } else {
                console.log('⚠️ verifySession function not available, checking local expiry...');
                
                // Fallback to local expiry check if Supabase not available
                if (session.timestamp && now - session.timestamp < 24 * 60 * 60 * 1000) {
                    console.log('✅ Session valid based on local timestamp');
                    currentUser = session;
                    return true;
                } else {
                    console.log('⏰ Session expired based on local timestamp, clearing...');
                    clearSession();
                }
            }
        } catch (error) {
            console.error('❌ Invalid session data, clearing...', error);
            clearSession();
        }
    } else {
        console.log('🔎 No existing session found');
    }
    
    return false;
}

// Authenticate with PIN
async function authenticateWithPIN(pin) {
    console.log('🔐 Attempting authentication with PIN:', pin.length, 'digits');
    
    try {
        // Verify PIN with Supabase
        if (window.verifyPin) {
            const result = await window.verifyPin(pin);
            
            if (result.success && result.role) {
                console.log('✅ PIN verified by Supabase, role:', result.role);
                
                // Generate a user ID if needed
                const userId = generateUserId();
                
                // Create a session
                let sessionId = null;
                if (window.createAuthSession) {
                    sessionId = await window.createAuthSession(userId, result.role);
                    console.log('✅ Session created with ID:', sessionId);
                }
                
                // Set user session
                currentUser = {
                    role: result.role,
                    authenticated: true,
                    timestamp: Date.now(),
                    userId: userId,
                    sessionId: sessionId
                };
                
                // Save session to localStorage
                localStorage.setItem('familyapp_session', JSON.stringify(currentUser));
                
                // Apply UI permissions after a small delay to ensure DOM is ready
                setTimeout(() => {
                    applyUIPermissions(result.role);
                }, 100);
                
                return true;
            } else {
                console.log('❌ Invalid PIN according to Supabase');
                return false;
            }
        } else {
            console.log('⚠️ Supabase verification not available, falling back to demo mode');
            
            // FALLBACK: Demo mode with hardcoded PINs
            // This should only be used when Supabase is not available
            let role = ROLES.GUEST;
            
            if (pin === '12345678') {
                role = ROLES.PARENT;
                console.log('✅ Parent access granted (DEMO MODE)');
            } else if (pin === '1234') {
                role = ROLES.VIEWER;
                console.log('✅ Viewer access granted (DEMO MODE)');
            } else {
                console.log('❌ Invalid PIN (DEMO MODE)');
                return false;
            }
            
            // Set user session
            currentUser = {
                role: role,
                authenticated: true,
                timestamp: Date.now(),
                userId: generateUserId(),
                sessionId: null
            };
            
            // Save session to localStorage
            localStorage.setItem('familyapp_session', JSON.stringify(currentUser));
            
            // Apply UI permissions after a small delay to ensure DOM is ready
            setTimeout(() => {
                applyUIPermissions(role);
            }, 100);
            
            return true;
        }
    } catch (error) {
        console.error('❌ Authentication error:', error);
        return false;
    }
}

// Generate a unique user ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Apply UI permissions based on role
function applyUIPermissions(role) {
    console.log('🎭 Applying UI permissions for role:', role);
    
    // Get UI elements - use better selectors
    const uploadPhotoBtn = document.querySelector('button[onclick*="openUploadModal"]');
    const uploadVideoBtn = document.querySelector('button[onclick*="openVideoUploadModal"]');
    const searchInputContainer = document.querySelector('.relative.flex-1');
    const skillsLink = document.querySelector('a[href*="skills"]');
    
    if (role === ROLES.PARENT) {
        // Parent can do everything
        if (uploadPhotoBtn) uploadPhotoBtn.style.display = 'block';
        if (uploadVideoBtn) uploadVideoBtn.style.display = 'block';
        if (skillsLink) skillsLink.style.display = 'block';
        
        console.log('👑 Parent permissions applied - full access');
        
    } else if (role === ROLES.VIEWER) {
        // Viewer can only see photos - hide upload buttons
        if (uploadPhotoBtn) uploadPhotoBtn.style.display = 'none';
        if (uploadVideoBtn) uploadVideoBtn.style.display = 'none';
        if (skillsLink) skillsLink.style.display = 'none';
        
        // Hide the upload buttons in search bar
        if (searchInputContainer) {
            const uploadButtons = searchInputContainer.querySelectorAll('button');
            uploadButtons.forEach(btn => {
                btn.style.display = 'none';
            });
        }
        
        console.log('👁️ Viewer permissions applied - read only');
    }
    
    // Add logout button
    addLogoutButton();
}

// Add logout button to navigation
function addLogoutButton() {
    const nav = document.querySelector('nav .flex.items-center.space-x-4');
    
    if (nav && !document.getElementById('logoutButton')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutButton';
        logoutBtn.className = 'text-white hover:text-gray-200 transition text-sm bg-white/20 px-3 py-1 rounded-lg';
        logoutBtn.textContent = 'Logout';
        logoutBtn.onclick = logout;
        
        nav.appendChild(logoutBtn);
    }
}

// Logout function
function logout() {
    console.log('🚪 Logging out...');
    clearSession();
    location.reload();
}

// Clear session
function clearSession() {
    localStorage.removeItem('familyapp_session');
    currentUser = {
        role: ROLES.GUEST,
        authenticated: false,
        timestamp: null,
        userId: null,
        sessionId: null
    };
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user has permission
function hasPermission(permission) {
    switch (permission) {
        case 'upload':
            return currentUser.role === ROLES.PARENT;
        case 'view':
            return currentUser.role === ROLES.VIEWER || currentUser.role === ROLES.PARENT;
        case 'skills':
            return currentUser.role === ROLES.PARENT;
        default:
            return false;
    }
}

// Show authentication modal
function showAuthModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="authModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" style="backdrop-filter: blur(10px);">
            <div class="bg-white rounded-2xl p-8 w-96 max-w-90vw shadow-2xl">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">Acceseaza albumul familial</h2>
                    <p class="text-gray-600">Introdu codul de acces pentru a continua</p>
                </div>
                
                <form id="authForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Cod de acces</label>
                        <input 
                            type="password" 
                            id="pinInput" 
                            class="w-full p-3 border-2 border-gray-200 rounded-lg text-center text-lg font-mono focus:outline-none focus:border-blue-500 transition"
                            placeholder="Introdu PIN"
                            maxlength="8"
                            autocomplete="off"
                        >
                    </div>
                    
                    <div id="authError" class="hidden text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">
                        
                        Codul de acces este invalid. Te rugam sa incerci din nou.
                    </div>
                    
                    <button 
                        type="submit" 
                        class="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition duration-200"
                    >
                        Acceseaza Albumul
                    </button>
                </form>
                
                <div class="mt-6 text-center">
                    <div class="text-xs text-gray-500 space-y-1">
                        <p><strong>For viewing:</strong> 4-digit code (1234)</p>
                        <p><strong>For managing:</strong> 8-digit code (12345678)</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Setup form handler
    const form = document.getElementById('authForm');
    const pinInput = document.getElementById('pinInput');
    const errorDiv = document.getElementById('authError');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = pinInput.value.trim();
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Verifying...';
        submitButton.disabled = true;
        
        // Authenticate with PIN
        const isAuthenticated = await authenticateWithPIN(pin);
        
        if (isAuthenticated) {
            // Remove modal
            document.getElementById('authModal').remove();
            
            // Show content
            showContent();
            
            // Initialize the app after authentication
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                // Re-initialize the main app
                if (window.initializeApp) {
                    setTimeout(() => {
                        window.initializeApp();
                    }, 100);
                }
            } else if (window.location.pathname.includes('skills.html')) {
                // Re-initialize the skills app
                if (window.initializeSkillsApp) {
                    setTimeout(() => {
                        window.initializeSkillsApp();
                    }, 100);
                }
            }
        } else {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            // Show error
            errorDiv.classList.remove('hidden');
            pinInput.value = '';
            pinInput.focus();
            
            // Shake animation
            pinInput.classList.add('animate-pulse');
            setTimeout(() => {
                pinInput.classList.remove('animate-pulse');
            }, 500);
        }
    });
    
    // Focus on input
    setTimeout(() => pinInput.focus(), 100);
    
    // Hide error when user starts typing
    pinInput.addEventListener('input', () => {
        errorDiv.classList.add('hidden');
    });
}

// Hide content until authenticated
function hideContent() {
    const mainContent = document.querySelector('body > *:not(nav)');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
}

// Show content after authentication
function showContent() {
    const mainContent = document.querySelector('body > *:not(nav)');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
}

// Initialize auth system when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Initializing auth system...');
    
    // Check for existing session
    initAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            // User already authenticated
            console.log('✅ User already authenticated as:', currentUser.role);
            applyUIPermissions(currentUser.role);
            showContent();
        } else {
            // Need to authenticate
            console.log('🔑 Authentication required');
            hideContent();
            showAuthModal();
        }
    }).catch(error => {
        console.error('❌ Auth initialization error:', error);
        hideContent();
        showAuthModal();
    });
});

// Export functions for use in other modules
window.FamilyAuth = {
    getCurrentUser,
    hasPermission,
    logout,
    ROLES
};