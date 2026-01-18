/**
 * Industrial Insta-Post - Application principale
 * MVP pour publication Instagram automatisée via n8n
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    // URL du webhook n8n (à remplacer par votre URL n8n Cloud)
    N8N_WEBHOOK_URL: 'https://VOTRE-INSTANCE.app.n8n.cloud/webhook/insta-post',

    // Facebook App ID (à remplacer par votre App ID Meta)
    FB_APP_ID: 'VOTRE_APP_ID',

    // Permissions Facebook requises
    FB_PERMISSIONS: 'instagram_basic,instagram_content_publish,pages_show_list',

    // Qualité de compression JPEG (0.1 - 1.0)
    IMAGE_QUALITY: 0.85,

    // Taille max de l'image (pixels)
    MAX_IMAGE_SIZE: 1080
};

// =============================================================================
// ÉTAT DE L'APPLICATION
// =============================================================================

const state = {
    stream: null,
    currentFacingMode: 'environment', // 'user' ou 'environment'
    capturedImage: null, // Blob de l'image capturée
    capturedImageBase64: null,
    generatedCaption: '',
    accessToken: null,
    userId: null,
    instagramAccountId: null,
    userName: null
};

// =============================================================================
// ÉLÉMENTS DOM
// =============================================================================

const elements = {
    // Sections
    authSection: document.getElementById('auth-section'),
    captureSection: document.getElementById('capture-section'),
    previewSection: document.getElementById('preview-section'),
    analysisSection: document.getElementById('analysis-section'),
    resultSection: document.getElementById('result-section'),
    successSection: document.getElementById('success-section'),

    // Auth
    btnLogin: document.getElementById('btn-login'),
    userInfo: document.getElementById('user-info'),

    // Camera
    cameraPreview: document.getElementById('camera-preview'),
    photoCanvas: document.getElementById('photo-canvas'),
    btnCapture: document.getElementById('btn-capture'),
    btnSwitchCamera: document.getElementById('btn-switch-camera'),

    // Preview
    photoPreview: document.getElementById('photo-preview'),
    btnRetake: document.getElementById('btn-retake'),
    btnAnalyze: document.getElementById('btn-analyze'),

    // Result
    resultImage: document.getElementById('result-image'),
    captionText: document.getElementById('caption-text'),
    btnCopy: document.getElementById('btn-copy'),
    btnRegenerate: document.getElementById('btn-regenerate'),
    btnPublish: document.getElementById('btn-publish'),
    btnShare: document.getElementById('btn-share'),
    btnNew: document.getElementById('btn-new'),

    // Success
    postLink: document.getElementById('post-link'),
    btnRestart: document.getElementById('btn-restart'),

    // Toast
    toast: document.getElementById('toast')
};

// =============================================================================
// INITIALISATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    attachEventListeners();
});

function initApp() {
    // Vérifier si un token est stocké
    const storedToken = localStorage.getItem('fb_access_token');
    const storedUserId = localStorage.getItem('fb_user_id');
    const storedUserName = localStorage.getItem('fb_user_name');
    const storedIgAccountId = localStorage.getItem('ig_account_id');

    if (storedToken && storedUserId) {
        state.accessToken = storedToken;
        state.userId = storedUserId;
        state.userName = storedUserName;
        state.instagramAccountId = storedIgAccountId;
        showLoggedInState();
    }

    // Charger le SDK Facebook
    loadFacebookSDK();
}

function attachEventListeners() {
    // Auth
    elements.btnLogin.addEventListener('click', handleFacebookLogin);

    // Camera
    elements.btnCapture.addEventListener('click', capturePhoto);
    elements.btnSwitchCamera.addEventListener('click', switchCamera);

    // Preview
    elements.btnRetake.addEventListener('click', retakePhoto);
    elements.btnAnalyze.addEventListener('click', analyzePhoto);

    // Result
    elements.btnCopy.addEventListener('click', copyCaption);
    elements.btnRegenerate.addEventListener('click', regenerateCaption);
    elements.btnPublish.addEventListener('click', publishToInstagram);
    elements.btnShare.addEventListener('click', shareNative);
    elements.btnNew.addEventListener('click', startNewCapture);

    // Success
    elements.btnRestart.addEventListener('click', startNewCapture);
}

// =============================================================================
// FACEBOOK SDK & AUTH
// =============================================================================

function loadFacebookSDK() {
    window.fbAsyncInit = function() {
        FB.init({
            appId: CONFIG.FB_APP_ID,
            cookie: true,
            xfbml: true,
            version: 'v18.0'
        });
    };

    // Charger le SDK de manière asynchrone
    (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/fr_FR/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
}

function handleFacebookLogin() {
    if (typeof FB === 'undefined') {
        showToast('SDK Facebook en cours de chargement...', 'error');
        return;
    }

    FB.login(function(response) {
        if (response.authResponse) {
            state.accessToken = response.authResponse.accessToken;
            state.userId = response.authResponse.userID;

            // Récupérer les infos utilisateur
            FB.api('/me', { fields: 'name' }, function(userResponse) {
                state.userName = userResponse.name;
                localStorage.setItem('fb_access_token', state.accessToken);
                localStorage.setItem('fb_user_id', state.userId);
                localStorage.setItem('fb_user_name', state.userName);

                // Récupérer le compte Instagram lié
                fetchInstagramAccount();
            });
        } else {
            showToast('Connexion annulée', 'error');
        }
    }, { scope: CONFIG.FB_PERMISSIONS });
}

async function fetchInstagramAccount() {
    try {
        // Récupérer les pages Facebook
        const pagesResponse = await new Promise((resolve, reject) => {
            FB.api('/me/accounts', function(response) {
                if (response.error) reject(response.error);
                else resolve(response);
            });
        });

        if (!pagesResponse.data || pagesResponse.data.length === 0) {
            showToast('Aucune page Facebook trouvée', 'error');
            return;
        }

        const page = pagesResponse.data[0];
        const pageAccessToken = page.access_token;

        // Récupérer le compte Instagram lié à la page
        const igResponse = await new Promise((resolve, reject) => {
            FB.api(
                `/${page.id}?fields=instagram_business_account`,
                function(response) {
                    if (response.error) reject(response.error);
                    else resolve(response);
                }
            );
        });

        if (igResponse.instagram_business_account) {
            state.instagramAccountId = igResponse.instagram_business_account.id;
            state.accessToken = pageAccessToken; // Utiliser le token de la page
            localStorage.setItem('ig_account_id', state.instagramAccountId);
            localStorage.setItem('fb_access_token', pageAccessToken);

            showLoggedInState();
            showToast('Connexion réussie !', 'success');
        } else {
            showToast('Aucun compte Instagram Pro lié', 'error');
        }
    } catch (error) {
        console.error('Erreur Instagram:', error);
        showToast('Erreur lors de la récupération du compte IG', 'error');
    }
}

function showLoggedInState() {
    elements.userInfo.textContent = `Connecté en tant que ${state.userName || 'Utilisateur'}`;
    elements.userInfo.classList.remove('hidden');
    elements.btnLogin.textContent = '✓ Connecté';
    elements.btnLogin.disabled = true;

    // Démarrer la caméra
    startCamera();
}

function logout() {
    state.accessToken = null;
    state.userId = null;
    state.userName = null;
    state.instagramAccountId = null;

    localStorage.removeItem('fb_access_token');
    localStorage.removeItem('fb_user_id');
    localStorage.removeItem('fb_user_name');
    localStorage.removeItem('ig_account_id');

    elements.userInfo.classList.add('hidden');
    elements.btnLogin.textContent = 'Connexion Facebook';
    elements.btnLogin.disabled = false;

    stopCamera();
    showSection('auth');
}

// =============================================================================
// GESTION DE LA CAMÉRA
// =============================================================================

async function startCamera() {
    try {
        // Arrêter le flux existant s'il y en a un
        stopCamera();

        const constraints = {
            video: {
                facingMode: state.currentFacingMode,
                width: { ideal: 1080 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.cameraPreview.srcObject = state.stream;

        showSection('capture');
    } catch (error) {
        console.error('Erreur caméra:', error);

        if (error.name === 'NotAllowedError') {
            showToast('Accès caméra refusé. Vérifiez les permissions.', 'error');
        } else if (error.name === 'NotFoundError') {
            showToast('Aucune caméra détectée', 'error');
        } else {
            showToast('Erreur d\'accès à la caméra', 'error');
        }
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
}

async function switchCamera() {
    state.currentFacingMode = state.currentFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera();
}

function capturePhoto() {
    const video = elements.cameraPreview;
    const canvas = elements.photoCanvas;
    const ctx = canvas.getContext('2d');

    // Calculer les dimensions pour un carré
    const size = Math.min(video.videoWidth, video.videoHeight);
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;

    // Limiter la taille
    const outputSize = Math.min(size, CONFIG.MAX_IMAGE_SIZE);
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Dessiner l'image recadrée en carré
    ctx.drawImage(
        video,
        offsetX, offsetY, size, size, // Source (recadrage carré)
        0, 0, outputSize, outputSize   // Destination
    );

    // Convertir en Blob
    canvas.toBlob((blob) => {
        state.capturedImage = blob;

        // Convertir aussi en base64 pour l'affichage
        const reader = new FileReader();
        reader.onload = () => {
            state.capturedImageBase64 = reader.result;
            elements.photoPreview.src = reader.result;
            showSection('preview');
        };
        reader.readAsDataURL(blob);
    }, 'image/jpeg', CONFIG.IMAGE_QUALITY);
}

function retakePhoto() {
    state.capturedImage = null;
    state.capturedImageBase64 = null;
    showSection('capture');
}

// =============================================================================
// ANALYSE IA (via n8n)
// =============================================================================

async function analyzePhoto() {
    if (!state.capturedImage) {
        showToast('Aucune image à analyser', 'error');
        return;
    }

    showSection('analysis');

    try {
        // Préparer les données
        const formData = new FormData();
        formData.append('image', state.capturedImage, 'photo.jpg');
        formData.append('userId', state.userId || 'anonymous');
        formData.append('action', 'analyze');

        // Envoyer à n8n
        const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.caption) {
            state.generatedCaption = data.caption;
            elements.captionText.value = data.caption;
            elements.resultImage.src = state.capturedImageBase64;
            showSection('result');
            showToast('Légende générée !', 'success');
        } else {
            throw new Error('Pas de légende dans la réponse');
        }
    } catch (error) {
        console.error('Erreur analyse:', error);
        showToast('Erreur lors de l\'analyse. Réessayez.', 'error');
        showSection('preview');
    }
}

async function regenerateCaption() {
    elements.btnRegenerate.disabled = true;
    elements.btnRegenerate.textContent = '⏳ Génération...';

    try {
        const formData = new FormData();
        formData.append('image', state.capturedImage, 'photo.jpg');
        formData.append('userId', state.userId || 'anonymous');
        formData.append('action', 'regenerate');
        formData.append('previousCaption', elements.captionText.value);

        const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.caption) {
            state.generatedCaption = data.caption;
            elements.captionText.value = data.caption;
            showToast('Nouvelle légende générée !', 'success');
        }
    } catch (error) {
        console.error('Erreur régénération:', error);
        showToast('Erreur lors de la régénération', 'error');
    } finally {
        elements.btnRegenerate.disabled = false;
        elements.btnRegenerate.textContent = '🔄 Régénérer';
    }
}

// =============================================================================
// PUBLICATION INSTAGRAM
// =============================================================================

async function publishToInstagram() {
    if (!state.instagramAccountId || !state.accessToken) {
        showToast('Veuillez vous connecter avec un compte Instagram Pro', 'error');
        return;
    }

    elements.btnPublish.disabled = true;
    elements.btnPublish.textContent = '⏳ Publication en cours...';

    try {
        const formData = new FormData();
        formData.append('image', state.capturedImage, 'photo.jpg');
        formData.append('caption', elements.captionText.value);
        formData.append('action', 'publish');
        formData.append('accessToken', state.accessToken);
        formData.append('instagramAccountId', state.instagramAccountId);

        const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.postId) {
            elements.postLink.innerHTML = `
                <a href="https://www.instagram.com/p/${data.postId}/" target="_blank">
                    Voir le post sur Instagram
                </a>
            `;
            showSection('success');
            showToast('Publication réussie !', 'success');
        } else {
            throw new Error(data.error || 'Erreur de publication');
        }
    } catch (error) {
        console.error('Erreur publication:', error);
        showToast('Erreur lors de la publication', 'error');
    } finally {
        elements.btnPublish.disabled = false;
        elements.btnPublish.textContent = '📤 Publier sur Instagram';
    }
}

// =============================================================================
// PARTAGE NATIF (Web Share API)
// =============================================================================

async function shareNative() {
    // Copier d'abord la légende
    await copyCaption();

    if (navigator.share && navigator.canShare) {
        try {
            const file = new File([state.capturedImage], 'photo.jpg', { type: 'image/jpeg' });

            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Industrial Insta-Post',
                    text: elements.captionText.value
                });
                showToast('Partage réussi !', 'success');
            } else {
                // Fallback : partager sans fichier
                await navigator.share({
                    title: 'Industrial Insta-Post',
                    text: elements.captionText.value
                });
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Erreur partage:', error);
                showToast('La légende a été copiée. Collez-la dans Instagram.', 'success');
            }
        }
    } else {
        // Navigateur ne supporte pas Web Share API
        showToast('La légende a été copiée. Ouvrez Instagram et collez.', 'success');
    }
}

// =============================================================================
// UTILITAIRES
// =============================================================================

function copyCaption() {
    const text = elements.captionText.value;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                showToast('Légende copiée !', 'success');
            })
            .catch(() => {
                fallbackCopy(text);
            });
    } else {
        fallbackCopy(text);
        return Promise.resolve();
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Légende copiée !', 'success');
}

function showSection(sectionName) {
    // Cacher toutes les sections
    elements.authSection.classList.add('hidden');
    elements.captureSection.classList.add('hidden');
    elements.previewSection.classList.add('hidden');
    elements.analysisSection.classList.add('hidden');
    elements.resultSection.classList.add('hidden');
    elements.successSection.classList.add('hidden');

    // Afficher la section demandée
    switch (sectionName) {
        case 'auth':
            elements.authSection.classList.remove('hidden');
            break;
        case 'capture':
            elements.authSection.classList.remove('hidden');
            elements.captureSection.classList.remove('hidden');
            break;
        case 'preview':
            elements.authSection.classList.remove('hidden');
            elements.previewSection.classList.remove('hidden');
            break;
        case 'analysis':
            elements.authSection.classList.remove('hidden');
            elements.analysisSection.classList.remove('hidden');
            break;
        case 'result':
            elements.authSection.classList.remove('hidden');
            elements.resultSection.classList.remove('hidden');
            break;
        case 'success':
            elements.authSection.classList.remove('hidden');
            elements.successSection.classList.remove('hidden');
            break;
    }
}

function showToast(message, type = 'success') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');

    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

function startNewCapture() {
    state.capturedImage = null;
    state.capturedImageBase64 = null;
    state.generatedCaption = '';
    elements.captionText.value = '';

    startCamera();
}

// =============================================================================
// SERVICE WORKER (PWA)
// =============================================================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed:', err));
    });
}
