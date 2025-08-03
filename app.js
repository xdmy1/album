// app.js - Main application logic for the family album

// Global state
const AppState = {
    photos: [],
    filteredPhotos: [],
    currentMonth: new Date(),
    isLoading: false,
    user: null
};

// Lazy loading state
let imageObserver;
let loadedImages = new Set();
const BATCH_SIZE = 6; // Load 6 images per batch
const LOADING_THRESHOLD = '100px'; // Start loading 100px before entering viewport

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Main app loaded, waiting for initialization...');
    // Wait a bit for Firebase to load
    setTimeout(initializeApp, 1000);
});

// Make initialization function global so auth can call it
window.initializeApp = async function() {
    try {
        console.log('🚀 Initializing main app...');
        showLoading(true);
        
        // Wait for Firebase auth
        if (window.onAuthChange) {
            window.onAuthChange((user) => {
                AppState.user = user;
                console.log('Auth state changed:', user ? 'Logged in' : 'Not logged in');
            });
        }
        
        // Initialize lazy loading observer
        initializeLazyLoading();
        
        // Initialize calendar
        generateCalendar();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize post input state
        const postInput = document.getElementById('searchInput');
        if (postInput) {
            handlePostInputChange({ target: postInput });
        }
        
        // Load photos from Firebase
        await loadPhotos();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showLoading(false);
        showEmptyState();
    }
}

// Lazy Loading Implementation
function initializeLazyLoading() {
    console.log('🔍 Initializing lazy loading observer...');
    
    // Create intersection observer for lazy loading
    const observerOptions = {
        root: null, // Use viewport as root
        rootMargin: LOADING_THRESHOLD, // Start loading before entering viewport
        threshold: 0.1 // Trigger when 10% of element is visible
    };
    
    imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                imageObserver.unobserve(img); // Stop observing once loaded
            }
        });
    }, observerOptions);
    
    console.log('✅ Lazy loading observer initialized');
}

function loadImage(img) {
    const src = img.dataset.src;
    if (!src || loadedImages.has(src)) return;
    
    console.log('🖼️ Loading image:', src);
    
    // Create a new image to preload
    const imageLoader = new Image();
    
    imageLoader.onload = function() {
        // Image loaded successfully
        img.src = src;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        loadedImages.add(src);
        
        // Add fade-in animation
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease-in-out';
        setTimeout(() => {
            img.style.opacity = '1';
        }, 50);
        
        console.log('✅ Image loaded:', src);
    };
    
    imageLoader.onerror = function() {
        // Image failed to load
        console.error('❌ Failed to load image:', src);
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-error');
        
        // Show error placeholder
        img.src = generateErrorPlaceholder();
    };
    
    // Start loading
    img.classList.add('lazy-loading');
    imageLoader.src = src;
}

function generatePlaceholder(width = 400, height = 300) {
    // Generate a simple SVG placeholder
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <g transform="translate(50%, 50%)">
                <circle cx="0" cy="-10" r="3" fill="#d1d5db">
                    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0s"/>
                </circle>
                <circle cx="-8" cy="5" r="3" fill="#d1d5db">
                    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.3s"/>
                </circle>
                <circle cx="8" cy="5" r="3" fill="#d1d5db">
                    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.6s"/>
                </circle>
            </g>
            <text x="50%" y="65%" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">Loading...</text>
        </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function generateErrorPlaceholder() {
    const svg = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#fef2f2"/>
            <g transform="translate(50%, 50%)">
                <circle cx="0" cy="0" r="20" fill="#fca5a5" opacity="0.5"/>
                <path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
            </g>
            <text x="50%" y="70%" text-anchor="middle" fill="#dc2626" font-family="Arial, sans-serif" font-size="12">Failed to load</text>
        </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Batch Loading Implementation
function observeImagesInBatches() {
    const lazyImages = document.querySelectorAll('img[data-src]:not(.lazy-loaded):not(.lazy-loading)');
    let batchCount = 0;
    
    lazyImages.forEach((img, index) => {
        // Only observe images in the current batch
        if (index < BATCH_SIZE) {
            imageObserver.observe(img);
            batchCount++;
        }
    });
    
    console.log(`👀 Observing ${batchCount} images for lazy loading`);
    
    // Set up observer for loading next batch when user scrolls near bottom
    if (lazyImages.length > BATCH_SIZE) {
        observeScrollForNextBatch(lazyImages);
    }
}

function observeScrollForNextBatch(allImages) {
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Load next batch of images
                loadNextBatch(allImages);
                scrollObserver.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '200px' // Trigger 200px before reaching the trigger element
    });
    
    // Create a trigger element at the end of the loaded images
    const triggerElement = document.createElement('div');
    triggerElement.className = 'scroll-trigger';
    triggerElement.style.height = '1px';
    triggerElement.style.width = '100%';
    
    const grid = document.getElementById('photosGrid');
    if (grid) {
        // Insert trigger after the BATCH_SIZE-th photo
        const photos = grid.children;
        if (photos[BATCH_SIZE - 1]) {
            photos[BATCH_SIZE - 1].after(triggerElement);
            scrollObserver.observe(triggerElement);
        }
    }
}

function loadNextBatch(allImages) {
    const currentlyLoaded = document.querySelectorAll('img[data-src].lazy-loaded, img[data-src].lazy-loading').length;
    const nextBatch = Array.from(allImages).slice(currentlyLoaded, currentlyLoaded + BATCH_SIZE);
    
    nextBatch.forEach(img => {
        imageObserver.observe(img);
    });
    
    console.log(`📦 Loading next batch: ${nextBatch.length} images`);
    
    // Continue with next batch if there are more images
    if (allImages.length > currentlyLoaded + BATCH_SIZE) {
        setTimeout(() => {
            observeScrollForNextBatch(allImages);
        }, 1000);
    }
}

// Image Compression Functions
async function compressImage(file, options = {}) {
    const {
        maxWidth = 1920,
        maxHeight = 1080,
        quality = 0.8,
        type = 'image/jpeg'
    } = options;

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);
            
            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob
            canvas.toBlob(resolve, type, quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

function calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    let width = originalWidth;
    let height = originalHeight;
    
    // Calculate scaling factor
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scaleFactor = Math.min(widthRatio, heightRatio, 1); // Don't upscale
    
    if (scaleFactor < 1) {
        width = Math.round(originalWidth * scaleFactor);
        height = Math.round(originalHeight * scaleFactor);
    }
    
    return { width, height };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Event Listeners Setup
function setupEventListeners() {
    // Post input functionality - Like Facebook
    const postInput = document.getElementById('searchInput');
    if (postInput) {
        // Update placeholder to make it clear it's for posting
        postInput.placeholder = 'La ce te gândești?';
        
        // Handle input changes
        postInput.addEventListener('input', handlePostInputChange);
        
        // Handle Enter key to post
        postInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextPost();
            }
        });
    }
    // Hashtag search
    const hashtagSearch = document.getElementById('hashtagSearch');
    if (hashtagSearch) {
        hashtagSearch.addEventListener('input', handleHashtagSearch);
    }
    
    // Upload forms
    const photoForm = document.getElementById('photoUploadForm');
    if (photoForm) {
        photoForm.addEventListener('submit', handlePhotoUpload);
    }
    
    const videoForm = document.getElementById('videoUploadForm');
    if (videoForm) {
        videoForm.addEventListener('submit', handleVideoUpload);
    }
    
    // File input change listeners for compression preview
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoInputChange);
    }
    
    // Close modals on backdrop click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-backdrop')) {
            closeAllModals();
        }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Handle photo input change for compression preview
async function handlePhotoInputChange(e) {
    const file = e.target.files[0];
    const previewContainer = document.getElementById('compressionPreview');
    
    if (!file) {
        if (previewContainer) {
            previewContainer.classList.add('hidden');
        }
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        return;
    }
    
    try {
        // Show original file info
        const originalSize = file.size;
        
        // Compress image
        console.log('🗜️ Compressing image...', file.name);
        const compressedBlob = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8,
            type: 'image/jpeg'
        });
        
        const compressedSize = compressedBlob.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        // Show compression preview
        if (previewContainer) {
            previewContainer.classList.remove('hidden');
            previewContainer.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div class="flex items-center space-x-2 mb-2">
                        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                        </svg>
                        <span class="font-medium text-blue-800">Image Compression Preview</span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Original:</span>
                            <span class="font-semibold text-gray-800">${formatFileSize(originalSize)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Compressed:</span>
                            <span class="font-semibold text-green-600">${formatFileSize(compressedSize)}</span>
                        </div>
                    </div>
                    <div class="mt-2">
                        <span class="text-xs text-gray-600">Size reduction: </span>
                        <span class="text-xs font-semibold text-green-600">${compressionRatio}% smaller</span>
                    </div>
                </div>
            `;
        }
        
        console.log(`✅ Compression preview: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio}% reduction)`);
        
    } catch (error) {
        console.error('❌ Error generating compression preview:', error);
        if (previewContainer) {
            previewContainer.classList.add('hidden');
        }
    }
}

// Photo Loading and Display
async function loadPhotos() {
    try {
        showLoading(true);
        
        // Load photos from Firebase if available
        if (window.loadPhotosFromFirestore) {
            try {
                AppState.photos = await window.loadPhotosFromFirestore();
                console.log('Loaded from Firebase:', AppState.photos.length, 'photos');
            } catch (error) {
                console.log('Firebase load failed, using demo data:', error);
                AppState.photos = [];
            }
        }
        
        // If no photos from Firebase, load demo data
        if (!AppState.photos || AppState.photos.length === 0) {
            console.log('No photos found in Firebase, loading demo data...');
            AppState.photos = createDemoPhotos();
        }
        
        AppState.filteredPhotos = [...AppState.photos];
        displayPhotos();
        updatePhotoCount();
        populateHashtags();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading photos:', error);
        // Fallback to demo data
        AppState.photos = createDemoPhotos();
        AppState.filteredPhotos = [...AppState.photos];
        displayPhotos();
        updatePhotoCount();
        populateHashtags();
        showLoading(false);
    }
}

// In app.js, find the createDemoPhotos function and replace it with this one:

function createDemoPhotos() {
    return [
        {
            id: '0',
            url: '',
            description: 'Today was amazing! We went to the park and Damian learned how to ride his bike without training wheels! So proud of him! 🚴‍♂️ #proud #milestone #bikeride',
            hashtags: '#proud #milestone #bikeride',
            category: 'family',
            timestamp: new Date('2025-01-27'),
            type: 'text',
            uploadedBy: null
        },
        {
            id: '1',
            url: 'https://placehold.co/400x300/4CAF50/FFFFFF.png?text=Family+Photo+1',
            description: 'Beautiful day at the park with family',
            hashtags: '#ValeiTrandafirilor #family #park',
            category: 'travel',
            timestamp: new Date('2025-01-26'),
            type: 'image'
        },
        {
            id: '2',
            url: 'https://placehold.co/400x300/2196F3/FFFFFF.png?text=School+Day',
            description: 'First day of school! So excited to learn new things.',
            hashtags: '#school #firstday #memories #learning',
            category: 'first',
            timestamp: new Date('2025-01-25'),
            type: 'image'
        },
        {
            id: '3',
            url: 'https://placehold.co/400x300/FF9800/FFFFFF.png?text=Birthday+Fun',
            description: 'Birthday celebration with siblings - cake was delicious!',
            hashtags: '#birthday #siblings #celebration #cake',
            category: 'siblings',
            timestamp: new Date('2025-01-24'),
            type: 'image'
        },
        {
            id: '4',
            url: 'https://placehold.co/400x300/9C27B0/FFFFFF.png?text=Garden+Play',
            description: 'Playing in the garden on a sunny afternoon',
            hashtags: '#garden #play #fun #outdoor',
            category: 'events',
            timestamp: new Date('2025-01-23'),
            type: 'video'
        },
        {
            id: '5',
            url: 'https://placehold.co/400x300/F44336/FFFFFF.png?text=Vacation+Time',
            description: 'Amazing vacation memories with the whole family',
            hashtags: '#vacation #travel #memories #family',
            category: 'travel',
            timestamp: new Date('2025-01-22'),
            type: 'image'
        },
        {
            id: '6',
            url: 'https://placehold.co/400x300/607D8B/FFFFFF.png?text=Learning+Time',
            description: 'Learning new skills and having fun with it',
            hashtags: '#learning #skills #growth #education',
            category: 'school',
            timestamp: new Date('2025-01-21'),
            type: 'image'
        },
        // Add more demo photos for better lazy loading testing
        {
            id: '7',
            url: 'https://placehold.co/400x300/9E9E9E/FFFFFF.png?text=Memory+8',
            description: 'Another beautiful family memory',
            hashtags: '#family #memories #love',
            category: 'family',
            timestamp: new Date('2025-01-20'),
            type: 'image'
        },
        {
            id: '8',
            url: 'https://placehold.co/400x300/E91E63/FFFFFF.png?text=Memory+9',
            description: 'Fun times with friends and family',
            hashtags: '#friends #family #fun',
            category: 'events',
            timestamp: new Date('2025-01-19'),
            type: 'image'
        },
        {
            id: '9',
            url: 'https://placehold.co/400x300/00BCD4/FFFFFF.png?text=Memory+10',
            description: 'Learning and growing every day',
            hashtags: '#learning #growth #education',
            category: 'school',
            timestamp: new Date('2025-01-18'),
            type: 'image'
        }
    ];
}

function displayPhotos() {
    const grid = document.getElementById('photosGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid) return;
    
    // Hide loading and empty states
    if (loadingState) loadingState.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    
    if (!AppState.filteredPhotos || AppState.filteredPhotos.length === 0) {
        showEmptyState();
        return;
    }
    
    // Clear previous content and observers
    grid.innerHTML = '';
    
    // Remove old scroll triggers
    const oldTriggers = document.querySelectorAll('.scroll-trigger');
    oldTriggers.forEach(trigger => trigger.remove());
    
    AppState.filteredPhotos.forEach(photo => {
        const photoElement = createPhotoElement(photo);
        grid.appendChild(photoElement);
    });
    
    // Initialize lazy loading for the newly created images
    setTimeout(() => {
        observeImagesInBatches();
    }, 100);
}

function createPhotoElement(photo) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'relative rounded-2xl overflow-hidden shadow-lg cursor-pointer transform hover:scale-105 transition-transform duration-300 bg-white';
    photoDiv.onclick = () => openPhotoDetail(photo);
    
    if (photo.type === 'text') {
        // Text post - like Facebook status
        const userInitial = photo.uploadedBy ? photo.uploadedBy.charAt(0).toUpperCase() : 'D';
        photoDiv.innerHTML = `
            <div class="p-6 h-64 flex flex-col">
                <div class="flex items-center mb-4">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        ${userInitial}
                    </div>
                    <div class="ml-3">
                        <p class="font-semibold text-gray-800">Damian</p>
                        <p class="text-xs text-gray-500">${formatDate(photo.timestamp)}</p>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden">
                    <p class="text-gray-800 text-lg leading-relaxed break-words">${photo.description}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <div class="flex flex-wrap gap-1">
                        ${photo.hashtags.split(' ').filter(tag => tag.startsWith('#')).map(tag => 
                            `<span class="text-blue-500 text-sm">${tag}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }  else if (photo.type === 'video') {
        photoDiv.innerHTML = `
            <div class="relative group">
                <div class="w-full h-64 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center relative overflow-hidden">
                    <!-- Animated background -->
                    <div class="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 animate-pulse"></div>
                    
                    <!-- Play button -->
                    <div class="relative z-10 transform group-hover:scale-110 transition-transform duration-300">
                        <div class="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl">
                            <svg class="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                    
                    <!-- Video label -->
                    <div class="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                        <span class="text-white text-sm font-medium">Video</span>
                    </div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 photo-overlay p-4 text-white">
                    <div class="text-blue-300 text-sm font-medium truncate">${photo.hashtags}</div>
                    <div class="text-xs">${formatDate(photo.timestamp)}</div>
                </div>
            </div>
        `;
    } else {
        // Image with lazy loading
        const placeholderSrc = generatePlaceholder();
        photoDiv.innerHTML = `
            <img 
                src="${placeholderSrc}" 
                data-src="${photo.url}" 
                alt="Family photo" 
                class="w-full h-64 object-cover lazy-image" 
                loading="lazy"
            >
            <div class="absolute bottom-0 left-0 right-0 photo-overlay p-4 text-white">
                <div class="text-blue-300 text-sm font-medium truncate">${photo.hashtags}</div>
                <div class="text-xs">${formatDate(photo.timestamp)}</div>
            </div>
        `;
    }
    
    return photoDiv;
}

// Search and Filter Functions
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        AppState.filteredPhotos = [...AppState.photos];
    } else {
        AppState.filteredPhotos = AppState.photos.filter(photo => 
            photo.hashtags.toLowerCase().includes(searchTerm) ||
            photo.description.toLowerCase().includes(searchTerm)
        );
    }
    
    displayPhotos();
    
    // Show message if no results
    if (AppState.filteredPhotos.length === 0 && searchTerm !== '') {
        const grid = document.getElementById('photosGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Nu am găsit rezultate</h3>
                    <p class="text-gray-600">Încearcă să cauți după alte hashtag-uri sau descrieri</p>
                </div>
            `;
        }
    }
}

// Post Input Functions
function handlePostInputChange(e) {
    const postInput = e.target;
    const value = postInput.value.trim();
    const inputContainer = postInput.closest('.relative');
    
    if (!inputContainer) return;
    
    // Get or create the buttons container
    let buttonsContainer = inputContainer.querySelector('.absolute.right-2.top-2');
    if (!buttonsContainer) {
        buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'absolute right-2 top-2 flex space-x-1 sm:space-x-2';
        inputContainer.appendChild(buttonsContainer);
    }
    
    if (value.length > 0) {
        // Show send button, hide upload buttons
        buttonsContainer.innerHTML = `
            <button class="text-blue-500 hover:text-blue-700 p-1" onclick="handleTextPost()">
                <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
            </button>
        `;
    } else {
        // Show upload buttons
        const currentUser = window.FamilyAuth?.getCurrentUser();
        if (currentUser && currentUser.role === 'parent') {
            buttonsContainer.innerHTML = `
                <button class="text-blue-500 hover:text-blue-700 p-1" onclick="openUploadModal()">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </button>
                <button class="text-blue-500 hover:text-blue-700 p-1" onclick="openVideoUploadModal()">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                </button>
            `;
        } else {
            buttonsContainer.innerHTML = '';
        }
    }
}

async function handleTextPost() {
    // Check permissions first
    if (window.FamilyAuth && !window.FamilyAuth.hasPermission('upload')) {
        showErrorToast('You do not have permission to post');
        return;
    }
    
    const postInput = document.getElementById('searchInput');
    if (!postInput) return;
    
    const text = postInput.value.trim();
    if (!text) {
        showErrorToast('Please write something to post');
        return;
    }
    
    try {
        // Extract hashtags from the text
        const hashtagRegex = /#\w+/g;
        const hashtags = text.match(hashtagRegex) || [];
        const hashtagsString = hashtags.join(' ') || '#status';
        
        // Create text post object
        const textPostData = {
            description: text,
            hashtags: hashtagsString,
            category: 'family',
            type: 'text',
            uploadedBy: AppState.user?.uid || null
        };
        
        console.log('textPostData before save:', textPostData);
        // Save to Supabase if available
        if (window.savePhotoToFirestore) {
            const docId = await window.savePhotoToFirestore(textPostData);
            
            const newPost = {
                id: docId,
                ...textPostData,
                url: '', // No URL for text posts
                timestamp: new Date()
            };
            
            AppState.photos.unshift(newPost);
            showSuccessToast('Posted successfully!');
        } else {
            // Fallback to local storage
            const newPost = {
                id: Date.now().toString(),
                ...textPostData,
                url: '', // No URL for text posts
                timestamp: new Date()
            };
            
            AppState.photos.unshift(newPost);
            showSuccessToast('Posted locally (Supabase not connected)');
        }
        
        // Clear input
        postInput.value = '';
        handlePostInputChange({ target: postInput });
        
        // Update display
        AppState.filteredPhotos = [...AppState.photos];
        displayPhotos();
        updatePhotoCount();
        populateHashtags();
        
    } catch (error) {
        console.error('Error posting text:', error);
        showErrorToast('Failed to post: ' + error.message);
    }
}

// Make handleTextPost global
window.handleTextPost = handleTextPost;

function handleHashtagSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterByHashtag(searchTerm);
}

function filterByHashtag(hashtag) {
    if (!hashtag || hashtag === '') {
        AppState.filteredPhotos = [...AppState.photos];
    } else {
        AppState.filteredPhotos = AppState.photos.filter(photo => 
            photo.hashtags.toLowerCase().includes(hashtag.toLowerCase())
        );
    }
    displayPhotos();
}

function filterByCategory(category) {
    AppState.filteredPhotos = AppState.photos.filter(photo => photo.category === category);
    displayPhotos();
}

function filterByDate(selectedDate) {
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + 5);
    
    AppState.filteredPhotos = AppState.photos.filter(photo => {
        const photoDate = new Date(photo.timestamp);
        return photoDate >= startDate && photoDate <= endDate;
    });
    
    displayPhotos();
}

// Calendar Functions
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    const year = AppState.currentMonth.getFullYear();
    const month = AppState.currentMonth.getMonth();
    
    // Update month display
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const currentMonthElement = document.getElementById('currentMonth');
    if (currentMonthElement) {
        currentMonthElement.textContent = monthNames[month] + ' ' + year;
    }
    
    // Clear previous calendar
    calendar.innerHTML = '';
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Adjust to start from Monday
    const dayOfWeek = firstDay.getDay();
    const adjustment = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - adjustment);
    
    // Generate calendar days
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'text-center p-1 cursor-pointer rounded hover:bg-blue-100 transition text-sm';
        dayElement.textContent = date.getDate();
        
        if (date.getMonth() !== month) {
            dayElement.className += ' text-gray-400';
        } else {
            dayElement.onclick = () => filterByDate(date);
        }
        
        calendar.appendChild(dayElement);
    }
}

function previousMonth() {
    AppState.currentMonth.setMonth(AppState.currentMonth.getMonth() - 1);
    generateCalendar();
}

function nextMonth() {
    AppState.currentMonth.setMonth(AppState.currentMonth.getMonth() + 1);
    generateCalendar();
}

// Upload Functions with Compression
async function handlePhotoUpload(e) {
    e.preventDefault();
    
    // Check permissions first
    if (window.FamilyAuth && !window.FamilyAuth.hasPermission('upload')) {
        showErrorToast('You do not have permission to upload photos');
        return;
    }
    
    const file = document.getElementById('photoInput').files[0];
    const description = document.getElementById('photoDescription').value.trim();
    const hashtags = document.getElementById('photoHashtags').value.trim();
    const category = document.getElementById('photoCategory').value;
    
    if (!file) {
        showErrorToast('Please select a file');
        return;
    }
    
    try {
        // Validate file
        validateFile(file, 'image');
        
        // Show loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Compressing & Uploading...';
        submitButton.disabled = true;
        
        // Compress image before upload
        console.log('🗜️ Compressing image before upload...');
        const originalSize = file.size;
        
        const compressedBlob = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8,
            type: 'image/jpeg'
        });
        
        const compressedSize = compressedBlob.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        
        console.log(`✅ Image compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${compressionRatio}% reduction)`);
        
        // Create compressed file object
        const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        // Check if Supabase functions are available
        if (window.uploadFileToStorage && window.savePhotoToFirestore) {
            // Upload compressed file to Supabase Storage
            console.log('Starting upload process with compressed file...');
            const uploadResult = await window.uploadFileToStorage(compressedFile, 'photos');
            
            // Create photo object
            const photoData = {
                description: description || 'New family memory',
                hashtags: hashtags || '#family #memories',
                category: category,
                type: 'image',
                fileName: uploadResult.fileName,
                fileSize: compressedFile.size,
                uploadedBy: AppState.user?.uid || null
            };
            
            // Save to Supabase database
            const docId = await window.savePhotoToFirestore(photoData);
            
            // Add to local state with the document ID
            const newPhoto = {
                id: docId,
                ...photoData,
                url: uploadResult.url,
                timestamp: new Date()
            };
            
            AppState.photos.unshift(newPhoto);
            showSuccessToast(`Photo uploaded successfully! (${compressionRatio}% size reduction)`);
        } else {
            // Fallback to local storage if Supabase not available
            console.log('Supabase not available, using local storage');
            const newPhoto = {
                id: Date.now().toString(),
                url: URL.createObjectURL(compressedBlob),
                description: description || 'New family memory',
                hashtags: hashtags || '#family #memories',
                category: category,
                type: 'image',
                timestamp: new Date()
            };
            
            AppState.photos.unshift(newPhoto);
            showSuccessToast(`Photo saved locally (${compressionRatio}% compressed, Supabase not connected)`);
        }
        
        AppState.filteredPhotos = [...AppState.photos];
        
        // Update display
        displayPhotos();
        updatePhotoCount();
        populateHashtags();
        
        // Close modal and reset form
        closeUploadModal();
        
        // Reset button
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
    } catch (error) {
        console.error('Error uploading photo:', error);
        handleError(error, 'photo upload');
        
        // Reset button
        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Upload';
            submitButton.disabled = false;
        }
    }
}

async function handleVideoUpload(e) {
    e.preventDefault();
    
    // Check permissions first
    if (window.FamilyAuth && !window.FamilyAuth.hasPermission('upload')) {
        showErrorToast('You do not have permission to upload videos');
        return;
    }
    
    const file = document.getElementById('videoInput').files[0];
    const description = document.getElementById('videoDescription').value.trim();
    const hashtags = document.getElementById('videoHashtags').value.trim();
    const category = document.getElementById('videoCategory').value;
    
    if (!file) {
        showErrorToast('Please select a file');
        return;
    }
    // Add before upload, similar to photo compression
if (file.type.startsWith('video/')) {
    // For videos, we can't compress like images, but we can limit size
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('Video too large. Max 50MB allowed.');
    }
}
    
    try {
        // Validate file
        validateFile(file, 'video');
        
        // Show loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Uploading...';
        submitButton.disabled = true;
        
        // Check if Firebase functions are available
        if (window.uploadFileToStorage && window.savePhotoToFirestore) {
            // Upload file to Firebase Storage
            console.log('Starting video upload process...');
            const uploadResult = await window.uploadFileToStorage(file, 'videos');
            
            // Create video object
            const videoData = {
                description: description || 'New family video',
                hashtags: hashtags || '#family #memories',
                category: category,
                type: 'video',
                fileName: uploadResult.fileName,
                fileSize: file.size,
                uploadedBy: AppState.user?.uid || null
            };
            
            // Save to Firestore
            const docId = await window.savePhotoToFirestore(videoData);
            
            // Add to local state with the document ID
            const newVideo = {
                id: docId,
                ...videoData,
                url: uploadResult.url,
                timestamp: new Date()
            };
            
            AppState.photos.unshift(newVideo);
            showSuccessToast('Video uploaded to Firebase successfully!');
        } else {
            // Fallback to local storage if Firebase not available
            console.log('Firebase not available, using local storage');
            const newVideo = {
                id: Date.now().toString(),
                url: URL.createObjectURL(file),
                description: description || 'New family video',
                hashtags: hashtags || '#family #memories',
                category: category,
                type: 'video',
                timestamp: new Date()
            };
            
            AppState.photos.unshift(newVideo);
            showSuccessToast('Video saved locally (Firebase not connected)');
        }
        
        AppState.filteredPhotos = [...AppState.photos];
        
        // Update display
        displayPhotos();
        updatePhotoCount();
        populateHashtags();
        
        // Close modal and reset form
        closeVideoUploadModal();
        
        // Reset button
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        
    } catch (error) {
        console.error('Error uploading video:', error);
        handleError(error, 'video upload');
        
        // Reset button
        const submitButton = e.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Upload';
            submitButton.disabled = false;
        }
    }
}

// Modal Functions - make them global
window.toggleFilter = function() {
    const filterMenu = document.getElementById('filterMenu');
    if (filterMenu) {
        filterMenu.classList.toggle('hidden');
        
        if (!filterMenu.classList.contains('hidden')) {
            setTimeout(() => {
                filterMenu.classList.add('show');
            }, 10);
        } else {
            filterMenu.classList.remove('show');
        }
    }
}

window.openUploadModal = function() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeUploadModal = function() {
    const modal = document.getElementById('uploadModal');
    const form = document.getElementById('photoUploadForm');
    const previewContainer = document.getElementById('compressionPreview');
    
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (form) {
        form.reset();
    }
    if (previewContainer) {
        previewContainer.classList.add('hidden');
    }
}

window.openVideoUploadModal = function() {
    const modal = document.getElementById('videoUploadModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeVideoUploadModal = function() {
    const modal = document.getElementById('videoUploadModal');
    const form = document.getElementById('videoUploadForm');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (form) {
        form.reset();
    }
}

window.openPhotoDetail = function(photo) {
    const modal = document.getElementById('photoDetailModal');
    const content = document.getElementById('photoDetailContent');
    
    if (!modal || !content) return;
    
    if (photo.type === 'text') {
        const userInitial = photo.uploadedBy ? photo.uploadedBy.charAt(0).toUpperCase() : 'D';
        content.innerHTML = `
            <div class="max-w-2xl mx-auto">
                <div class="bg-gray-50 rounded-lg p-6">
                    <div class="flex items-center mb-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            ${userInitial}
                        </div>
                        <div class="ml-3">
                            <p class="font-semibold text-gray-800 text-lg">Damian</p>
                            <p class="text-sm text-gray-500">${formatDate(photo.timestamp)}</p>
                        </div>
                    </div>
                    <div class="mb-6">
                        <p class="text-gray-800 text-xl leading-relaxed whitespace-pre-wrap">${photo.description}</p>
                    </div>
                    <div class="pt-4 border-t border-gray-200">
                        <div class="flex flex-wrap gap-2">
                            ${photo.hashtags.split(' ').filter(tag => tag.startsWith('#')).map(tag => 
                                `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">${tag}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (photo.type === 'video') {
        content.innerHTML = `
            <div class="text-center mb-4">
                <video controls class="w-full max-w-4xl mx-auto rounded-xl shadow-2xl" preload="metadata" controlsList="nodownload">
                    <source src="${photo.url}" type="video/mp4">
                    <source src="${photo.url}" type="video/webm">
                    <source src="${photo.url}" type="video/ogg">
                    Your browser does not support video playback.
                </video>
            </div>
            <h2 class="text-2xl font-bold mb-2 text-gray-800">${photo.description}</h2>
            <p class="text-gray-600 mb-4">${formatDate(photo.timestamp)}</p>
            <div class="flex flex-wrap gap-2">
                ${photo.hashtags.split(' ').map(tag => 
                    `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">${tag}</span>`
                ).join('')}
            </div>
        `;
    } else {
        content.innerHTML = `
            <img src="${photo.url}" alt="Family photo" class="w-full max-w-2xl mx-auto rounded-lg mb-4" loading="lazy">
            <h2 class="text-2xl font-bold mb-2 text-gray-800">${photo.description}</h2>
            <p class="text-gray-600 mb-4">${formatDate(photo.timestamp)}</p>
            <div class="flex flex-wrap gap-2">
                ${photo.hashtags.split(' ').map(tag => 
                    `<span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">${tag}</span>`
                ).join('')}
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

window.closePhotoDetail = function() {
    const modal = document.getElementById('photoDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function closeAllModals() {
    closeUploadModal();
    closeVideoUploadModal();
    closePhotoDetail();
}

// Make calendar and filter functions global
window.previousMonth = previousMonth;
window.nextMonth = nextMonth;
window.filterByCategory = filterByCategory;

// Utility Functions
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        if (show) {
            loadingState.classList.remove('hidden');
        } else {
            loadingState.classList.add('hidden');
        }
    }
}

function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const photosGrid = document.getElementById('photosGrid');
    
    if (photosGrid) {
        photosGrid.innerHTML = '';
    }
    
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }
}

function updatePhotoCount() {
    const count = AppState.photos.length;
    const photoCountElement = document.getElementById('photoCount');
    if (photoCountElement) {
        const photos = AppState.photos.filter(p => p.type === 'image').length;
        const videos = AppState.photos.filter(p => p.type === 'video').length;
        const posts = AppState.photos.filter(p => p.type === 'text').length;
        
        let countText = `${count} `;
        if (posts > 0) {
            countText += 'Memorii';
        } else {
            countText += photos === 1 ? 'Memorie' : 'Memorii';
        }
        
        photoCountElement.textContent = countText;
    }
}

function populateHashtags() {
    const hashtagsList = document.getElementById('hashtagsList');
    if (!hashtagsList) return;
    
    const allHashtags = new Set();
    
    // Extract unique hashtags
    AppState.photos.forEach(photo => {
        const hashtags = photo.hashtags.split(' ').filter(tag => tag.startsWith('#'));
        hashtags.forEach(tag => allHashtags.add(tag));
    });
    
    // Create hashtag elements
    hashtagsList.innerHTML = '';
    Array.from(allHashtags).slice(0, 10).forEach(hashtag => {
        const span = document.createElement('span');
        span.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-200 transition';
        span.textContent = hashtag;
        span.onclick = () => filterByHashtag(hashtag);
        hashtagsList.appendChild(span);
    });
}

function formatDate(timestamp) {
    if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('ro-RO');
    } else if (timestamp && timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('ro-RO');
    } else {
        return new Date(timestamp).toLocaleDateString('ro-RO');
    }
}

// File Validation
function validateFile(file, type) {
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for images, 50MB for videos
    
    if (file.size > maxSize) {
        const sizeMB = Math.round(maxSize / (1024 * 1024));
        throw new Error(`File size must be less than ${sizeMB}MB`);
    }
    
    const allowedTypes = type === 'image' 
        ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        : ['video/mp4', 'video/webm', 'video/ogg'];
    
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return true;
}

// Error Handling
function handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly error message
    const errorMessage = getErrorMessage(error);
    showErrorToast(errorMessage);
}

function getErrorMessage(error) {
    if (error.code) {
        switch (error.code) {
            case 'storage/unauthorized':
                return 'You do not have permission to upload files.';
            case 'storage/quota-exceeded':
                return 'Storage quota exceeded. Please contact administrator.';
            case 'storage/invalid-format':
                return 'Invalid file format. Please choose a valid image or video.';
            default:
                return 'An error occurred. Please try again.';
        }
    }
    return error.message || 'An unexpected error occurred.';
}

function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 5000);
}

function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}
// Create text post object
const textPostData = {
    description: text,
    hashtags: hashtagsString,
    category: 'family',
    type: 'text',
    uploadedBy: AppState.user?.uid || null
};

// ADD THIS DEBUG LINE:
console.log('uploadedBy value:', textPostData.uploadedBy, typeof textPostData.uploadedBy);