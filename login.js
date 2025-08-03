// login.js - Login page logic with Supabase authentication

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    setTimeout(() => {
        checkExistingAuth();
    }, 1000);
    
    // Setup form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function checkExistingAuth() {
    try {
        // Get session from localStorage
        const savedSession = localStorage.getItem('familyapp_session');
        
        if (savedSession) {
            // Parse the session
            const session = JSON.parse(savedSession);
            
            // Verify session with Supabase if available
            if (window.verifySession && session.sessionId) {
                console.log('🔄 Verifying session with Supabase...');
                const result = await window.verifySession(session.sessionId);
                
                if (result.valid) {
                    console.log('✅ Valid session confirmed by Supabase');
                    // Redirect to main app
                    window.location.href = 'index.html';
                    return;
                }
            } else {
                // Fallback to checking local timestamp
                const now = Date.now();
                if (session.timestamp && now - session.timestamp < 24 * 60 * 60 * 1000) {
                    console.log('✅ Session valid based on local timestamp');
                    // Redirect to main app
                    window.location.href = 'index.html';
                    return;
                }
            }
            
            // Session is invalid or expired - clear it
            localStorage.removeItem('familyapp_session');
        }
        
        console.log('No valid existing session found');
    } catch (error) {
        console.log('Error checking auth:', error);
        localStorage.removeItem('familyapp_session');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const accessCode = document.getElementById('accessCode').value;
    const userName = document.getElementById('userName').value;
    const userRole = document.getElementById('userRole').value;
    
    // Validate form
    if (!accessCode || !userName || !userRole) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        // Hide any existing error messages
        hideError();
        
        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Logging in...';
        submitButton.disabled = true;
        
        // Verify PIN with Supabase
        let isValid = false;
        
        if (window.verifyPin) {
            console.log('🔑 Verifying PIN with Supabase...');
            const result = await window.verifyPin(accessCode);
            isValid = result.success;
            
            if (isValid) {
                console.log('✅ PIN verified, role:', result.role);
            } else {
                console.log('❌ Invalid PIN');
            }
        } else {
            // Fallback for demo
            console.log('⚠️ Supabase verification not available, using demo mode');
            isValid = accessCode === 'damian123' || accessCode === '1234' || accessCode === '12345678';
        }
        
        if (isValid) {
            // Create a user object
            const userId = generateUserId();
            
            // Create a session in Supabase if possible
            let sessionId = null;
            if (window.createAuthSession) {
                // For simplicity, use 'parent' role for login.html 
                sessionId = await window.createAuthSession(userId, 'parent');
                console.log('✅ Session created with ID:', sessionId);
            }
            
            // Save user data locally
            const userData = {
                role: 'parent', // Always use parent role for login.html
                authenticated: true,
                timestamp: Date.now(),
                name: userName,
                relationship: userRole,
                userId: userId,
                sessionId: sessionId
            };
            
            // Save to localStorage
            localStorage.setItem('familyapp_session', JSON.stringify(userData));
            
            // Redirect to main app
            window.location.href = 'index.html';
        } else {
            // Reset button
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            // Show error message
            showError('Invalid access code. Please contact the family to get the correct code.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Reset button state
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Access Album';
            submitButton.disabled = false;
        }
        
        showError('Login failed. Please try again.');
    }
}

function generateUserId() {
    // Generate a simple user ID
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
    }
}