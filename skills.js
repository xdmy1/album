// skills.js - Simplified Skills Progress Tracker

// Predefined skills organized by categories
const SKILL_CATEGORIES = {
    physical: {
        name: 'Physical Skills (Motor Development)',
        skills: [
            { id: 'skill_1', name: 'Gross Motor Skills', image: '/img/skills/gross-motor.jpg' },
            { id: 'skill_2', name: 'Fine Motor Skills', image: '/img/skills/fine-motor.jpg' },
            { id: 'skill_3', name: 'Balance & Coordination', image: '/img/skills/balance.jpg' },
            { id: 'skill_4', name: 'Running & Jumping', image: '/img/skills/running.jpg' },
            { id: 'skill_5', name: 'Hand-Eye Coordination', image: '/img/skills/hand-eye.jpg' }
        ]
    },
    cognitive: {
        name: 'Cognitive Skills',
        skills: [
            { id: 'skill_6', name: 'Memory & Recall', image: '/img/skills/memory.jpg' },
            { id: 'skill_7', name: 'Problem Solving', image: '/img/skills/problem-solving.jpg' },
            { id: 'skill_8', name: 'Logical Thinking', image: '/img/skills/logic.jpg' },
            { id: 'skill_9', name: 'Attention & Focus', image: '/img/skills/focus.jpg' },
            { id: 'skill_10', name: 'Mathematical Concepts', image: '/img/skills/math.jpg' }
        ]
    },
    language: {
        name: 'Language & Communication',
        skills: [
            { id: 'skill_11', name: 'Verbal Communication', image: '/img/skills/speaking.jpg' },
            { id: 'skill_12', name: 'Reading Skills', image: '/img/skills/reading.jpg' },
            { id: 'skill_13', name: 'Writing Skills', image: '/img/skills/writing.jpg' },
            { id: 'skill_14', name: 'Listening Skills', image: '/img/skills/listening.jpg' },
            { id: 'skill_15', name: 'Vocabulary Building', image: '/img/skills/vocabulary.jpg' }
        ]
    },
    social: {
        name: 'Social and Emotional Skills',
        skills: [
            { id: 'skill_16', name: 'Sharing & Cooperation', image: '/img/skills/sharing.jpg' },
            { id: 'skill_17', name: 'Empathy & Understanding', image: '/img/skills/empathy.jpg' },
            { id: 'skill_18', name: 'Emotional Regulation', image: '/img/skills/emotions.jpg' },
            { id: 'skill_19', name: 'Making Friends', image: '/img/skills/friendship.jpg' },
            { id: 'skill_20', name: 'Conflict Resolution', image: '/img/skills/conflict.jpg' }
        ]
    },
    selfcare: {
        name: 'Self-Care & Independence',
        skills: [
            { id: 'skill_21', name: 'Personal Hygiene', image: '/img/skills/hygiene.jpg' },
            { id: 'skill_22', name: 'Dressing & Grooming', image: '/img/skills/dressing.jpg' },
            { id: 'skill_23', name: 'Eating Independently', image: '/img/skills/eating.jpg' },
            { id: 'skill_24', name: 'Time Management', image: '/img/skills/time.jpg' },
            { id: 'skill_25', name: 'Responsibility & Chores', image: '/img/skills/chores.jpg' }
        ]
    },
    creative: {
        name: 'Creative & Expressive Skills',
        skills: [
            { id: 'skill_26', name: 'Drawing & Painting', image: '/img/skills/art.jpg' },
            { id: 'skill_27', name: 'Music & Rhythm', image: '/img/skills/music.jpg' },
            { id: 'skill_28', name: 'Dancing & Movement', image: '/img/skills/dance.jpg' },
            { id: 'skill_29', name: 'Imaginative Play', image: '/img/skills/imagination.jpg' },
            { id: 'skill_30', name: 'Storytelling', image: '/img/skills/storytelling.jpg' }
        ]
    },
    digital: {
        name: 'Digital & Modern Skills',
        skills: [
            { id: 'skill_31', name: 'Basic Computer Skills', image: '/img/skills/computer.jpg' },
            { id: 'skill_32', name: 'Digital Safety', image: '/img/skills/safety.jpg' },
            { id: 'skill_33', name: 'Educational Apps', image: '/img/skills/apps.jpg' },
            { id: 'skill_34', name: 'Technology Awareness', image: '/img/skills/technology.jpg' },
            { id: 'skill_35', name: 'Online Learning', image: '/img/skills/online.jpg' }
        ]
    }
};

// Flatten all skills for compatibility
const PREDEFINED_SKILLS = Object.values(SKILL_CATEGORIES)
    .flatMap(category => category.skills);

// Global variables
let skills = [];
let isParent = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Skills page loaded');
    setTimeout(initializeSkillsApp, 1000);
});

// Main initialization function
window.initializeSkillsApp = async function() {
    try {
        console.log('🚀 Initializing Skills App...');
        
        // Check authentication
        if (!window.FamilyAuth) {
            console.log('⚠️ Auth system not loaded, waiting...');
            setTimeout(initializeSkillsApp, 500);
            return;
        }
        
        const currentUser = window.FamilyAuth.getCurrentUser();
        if (!currentUser || currentUser.role === 'guest') {
            console.log('🚪 User not logged in');
            return;
        }
        
        // Set permissions
        isParent = currentUser.role === 'parent';
        console.log('✅ User role:', currentUser.role, '| Can edit:', isParent);
        
        // Show loading
        showLoading(true);
        
        // Load skills with progress
        await loadSkills();
        
        // Display skills
        displaySkills();
        
        // Hide loading
        showLoading(false);
        
        // Add role notice if viewer
        if (!isParent) {
            addViewerNotice();
        }
        
    } catch (error) {
        console.error('❌ Error initializing skills app:', error);
        showLoading(false);
        showError('Failed to load skills');
    }
};

// Load skills and merge with progress from Supabase or localStorage
async function loadSkills() {
    try {
        console.log('📥 Loading skills...');
        
        // Start with predefined skills (all at 0% progress)
        skills = PREDEFINED_SKILLS.map(skill => ({
            ...skill,
            progress: 0
        }));
        
        // Try to load from Supabase first
        try {
            if (window.loadPredefinedSkillsFromSupabase) {
                const savedProgress = await window.loadPredefinedSkillsFromSupabase();
                console.log('💾 Loaded progress for', savedProgress.length, 'skills from Supabase');
                
                // Merge saved progress with predefined skills
                skills = skills.map(skill => {
                    const savedSkill = savedProgress.find(s => s.preset_id === skill.id);
                    return {
                        ...skill,
                        progress: savedSkill ? savedSkill.progress : 0
                    };
                });
            }
        } catch (supabaseError) {
            console.log('⚠️ Supabase unavailable, trying localStorage fallback');
            
            // Load from localStorage as fallback
            const savedProgress = localStorage.getItem('skills_progress');
            if (savedProgress) {
                const progressData = JSON.parse(savedProgress);
                skills = skills.map(skill => ({
                    ...skill,
                    progress: progressData[skill.id] || 0
                }));
                console.log('💾 Loaded progress from localStorage');
            }
        }
        
        console.log('✅ Skills loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading skills:', error);
        // Keep predefined skills with 0 progress as fallback
    }
}

// Display all skills organized by categories
function displaySkills() {
    const container = document.getElementById('skillsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Display each category
    Object.entries(SKILL_CATEGORIES).forEach(([categoryKey, category]) => {
        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'flex items-center space-x-3 mb-4 mt-8 first:mt-0';
        categoryHeader.innerHTML = `
            <h2 class="text-lg font-bold text-gray-800">${category.name}</h2>
            <div class="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
        `;
        container.appendChild(categoryHeader);
        
        // Add skills in this category
        category.skills.forEach(skillTemplate => {
            const skill = skills.find(s => s.id === skillTemplate.id);
            if (skill) {
                const skillElement = createSkillElement(skill);
                container.appendChild(skillElement);
            }
        });
    });
    
    console.log('✅ Displayed', skills.length, 'skills in categories');
}

// Create individual skill element
function createSkillElement(skill) {
    const skillDiv = document.createElement('div');
    skillDiv.className = `skill-card bg-white rounded-2xl p-4 sm:p-6 shadow-lg border-2 border-gray-200`;
    
    const progressColor = getProgressColor(skill.progress);
    const statusText = getStatusText(skill.progress);
    
    // Control buttons - only show for parents
    const controlButtonsHtml = isParent ? `
        <div class="control-buttons rounded-full flex flex-shrink-0">
            <button onclick="changeProgress('${skill.id}', -10)" class="w-10 h-10 sm:w-12 sm:h-12 rounded-l-full border border-gray-200 hover:bg-gray-100 transition flex items-center justify-center">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                </svg>
            </button>
            <div class="w-px bg-gray-200"></div>
            <button onclick="changeProgress('${skill.id}', 10)" class="w-10 h-10 sm:w-12 sm:h-12 rounded-r-full border border-gray-200 hover:bg-gray-100 transition flex items-center justify-center">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
            </button>
        </div>
    ` : `
        <div class="text-xs text-gray-500 text-center">
            <svg class="w-5 h-5 mx-auto mb-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            View Only
        </div>
    `;
    
    skillDiv.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center space-x-4 flex-1">
                <div class="skill-icon w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 border-gray-200">
                    <img 
                        src="${skill.image}" 
                        alt="${skill.name}" 
                        class="w-full h-full object-cover"
                        onerror="this.src='https://via.placeholder.com/100x100/f3f4f6/9ca3af?text=${encodeURIComponent(skill.name.charAt(0))}';"
                    >
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                        <h3 class="text-lg sm:text-xl font-bold text-gray-800">${skill.name}</h3>
                        <span class="text-base sm:text-lg font-semibold text-${progressColor}-600">[${skill.progress}%]</span>
                    </div>
                    <div class="mb-2">
                        <div class="w-full bg-gray-200 rounded-full h-3 sm:h-4">
                            <div class="progress-bar bg-${progressColor}-500 h-3 sm:h-4 rounded-full transition-all duration-500" style="width: ${skill.progress}%"></div>
                        </div>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <span class="text-xs sm:text-sm text-gray-600">${statusText}</span>
                    </div>
                </div>
            </div>
            ${controlButtonsHtml}
        </div>
    `;
    
    return skillDiv;
}

// Change progress function - called from onclick
window.changeProgress = async function(skillId, change) {
    if (!isParent) {
        showError('Only parents can modify skill progress');
        return;
    }
    
    const skill = skills.find(s => s.id === skillId);
    if (!skill) {
        console.log('❌ Skill not found:', skillId);
        return;
    }
    
    // Calculate new progress
    const newProgress = Math.max(0, Math.min(100, skill.progress + change));
    
    if (newProgress === skill.progress) return; // No change needed
    
    console.log(`📊 Updating ${skill.name}: ${skill.progress}% → ${newProgress}%`);
    
    try {
        // Try Supabase first
        if (window.updatePredefinedSkillProgress) {
            try {
                await window.updatePredefinedSkillProgress(skillId, newProgress);
                console.log('✅ Progress saved to Supabase');
            } catch (supabaseError) {
                console.log('⚠️ Supabase failed, using localStorage:', supabaseError.message);
                saveToLocalStorage(skillId, newProgress);
            }
        } else {
            console.log('⚠️ Supabase not available, using localStorage');
            saveToLocalStorage(skillId, newProgress);
        }
        
        // Update local state
        skill.progress = newProgress;
        
        // Refresh display
        displaySkills();
        
        // Show success feedback
        showSuccess(`${skill.name} updated to ${newProgress}%`);
        
    } catch (error) {
        console.error('❌ Error updating progress:', error);
        showError(`Failed to save progress: ${error.message}`);
    }
};

// Save to localStorage fallback
function saveToLocalStorage(skillId, progress) {
    try {
        const savedProgress = JSON.parse(localStorage.getItem('skills_progress') || '{}');
        savedProgress[skillId] = progress;
        localStorage.setItem('skills_progress', JSON.stringify(savedProgress));
        console.log('💾 Progress saved to localStorage');
    } catch (error) {
        console.error('❌ localStorage save failed:', error);
    }
}

// Helper functions
function getProgressColor(progress) {
    if (progress < 30) return 'red';
    if (progress < 70) return 'orange';
    if (progress < 100) return 'orange';
    return 'green';
}

function getStatusText(progress) {
    if (progress === 0) return 'Not started';
    if (progress < 30) return 'Just started';
    if (progress < 70) return 'Making progress';
    if (progress < 100) return 'Almost complete';
    return 'Completed!';
}

function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.toggle('hidden', !show);
    }
}

function addViewerNotice() {
    const header = document.querySelector('.bg-white.rounded-2xl.shadow-lg.p-4');
    if (header && !document.getElementById('viewerNotice')) {
        const notice = document.createElement('div');
        notice.id = 'viewerNotice';
        notice.className = 'mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg';
        notice.innerHTML = `
            <div class="flex items-center space-x-2">
                <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span class="text-blue-700 text-sm font-medium">Viewing Mode - Only parents can modify progress</span>
            </div>
        `;
        header.appendChild(notice);
    }
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showToast(message, type) {
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-x-full'), 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, type === 'error' ? 5000 : 3000);
}

// Debug function - call from console: debugSkillsApp()
window.debugSkillsApp = function() {
    console.log('🔍 DEBUGGING SKILLS APP');
    console.log('📊 Current skills:', skills);
    console.log('👤 Current user:', window.FamilyAuth?.getCurrentUser());
    console.log('🔐 Is parent:', isParent);
    
    console.log('\n🔌 Supabase functions:');
    console.log('loadPredefinedSkillsFromSupabase:', typeof window.loadPredefinedSkillsFromSupabase);
    console.log('updatePredefinedSkillProgress:', typeof window.updatePredefinedSkillProgress);
    console.log('testConnection:', typeof window.testConnection);
    
    // Test connection
    if (window.testConnection) {
        window.testConnection().then(result => {
            console.log('🔌 Connection test:', result);
        });
    }
    
    // Test updating skill 1
    console.log('\n🧪 Testing update skill_1 to 50%...');
    if (window.updatePredefinedSkillProgress) {
        window.updatePredefinedSkillProgress('skill_1', 50)
            .then(result => console.log('✅ Test update result:', result))
            .catch(error => console.error('❌ Test update error:', error));
    }
};