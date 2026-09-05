// Authentication System for Notely
class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('notely_users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('notely_current_user')) || null;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        this.init();
    }
    
    init() {
        this.setupTheme();
        this.createParticles();
        this.bindEvents();
        
        // Check if user is already logged in on login or signup pages
        const currentPage = window.location.pathname.split('/').pop();
        if (this.currentUser && (currentPage === 'login.html' || currentPage === 'signup.html')) {
            this.redirectToApp();
        }
    }
    
    setupTheme() {
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (this.themeToggle) this.themeToggle.textContent = '☀️';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            if (this.themeToggle) this.themeToggle.textContent = '🌙';
        }
    }
    
    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random size between 2px and 6px
            const size = Math.random() * 4 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Random animation delay
            particle.style.animationDelay = `${Math.random() * 6}s`;
            particle.style.animationDuration = `${Math.random() * 3 + 3}s`;
            
            particlesContainer.appendChild(particle);
        }
    }
    
    bindEvents() {
        // Theme toggle
        this.themeToggle = document.getElementById('themeToggle');
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Signup form
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // Forgot password
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => this.handleForgotPassword(e));
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.setupTheme();
        
        // Add animation effect
        this.themeToggle.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            this.themeToggle.style.transform = '';
        }, 300);
    }
    
    async handleLogin(e) {
        console.log('handleLogin called');
        e.preventDefault();
        // Always reload users from localStorage to avoid stale data
        this.users = JSON.parse(localStorage.getItem('notely_users')) || [];
        console.log('Loaded users at login:', this.users);
        const form = e.target;
        const email = form.email.value.trim();
        const password = form.password.value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            // Validate input
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }
            
            // Find user
            const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            
            if (!user) {
                throw new Error('User not found. Please check your email or sign up.');
            }
            
            // Check password
            if (!this.verifyPassword(password, user.password)) {
                throw new Error('Incorrect password. Please try again.');
            }
            
            // Login successful
            this.currentUser = {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                createdAt: user.createdAt
            };
            
            localStorage.setItem('notely_current_user', JSON.stringify(this.currentUser));
            
            this.showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to main app
            setTimeout(() => {
                this.redirectToApp();
            }, 350);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            // Reset loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
    
    async handleSignup(e) {
        console.log('handleSignup called');
        e.preventDefault();
        // Always reload users from localStorage to avoid stale data
        this.users = JSON.parse(localStorage.getItem('notely_users')) || [];
        console.log('Loaded users at signup:', this.users);
        const form = e.target;
        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const submitBtn = form.querySelector('button[type="submit"]');
        const authLoadingOverlay = document.getElementById('authLoadingOverlay');
        
        // Show loading state
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        
        try {
            // Validate input
            if (!fullName || !email || !password || !confirmPassword) {
                throw new Error('Please fill in all fields');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            
            // Check if email already exists
            const existingUser = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existingUser) {
                throw new Error('An account with this email already exists');
            }
            
            // Create new user
            const newUser = {
                id: this.generateUserId(),
                fullName,
                email,
                password: this.hashPassword(password),
                createdAt: Date.now()
            };
            
            this.users.push(newUser);
            localStorage.setItem('notely_users', JSON.stringify(this.users));
            
            // Auto-login after signup
            this.currentUser = {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.fullName,
                createdAt: newUser.createdAt
            };
            localStorage.setItem('notely_current_user', JSON.stringify(this.currentUser));
            
            this.showMessage('Account created successfully! Redirecting...', 'success');
            
            // Redirect to main app
            setTimeout(() => {
                this.redirectToApp();
            }, 350);
            
        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            // Reset loading state
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }
    
    handleForgotPassword(e) {
        e.preventDefault();
        this.showMessage('Password reset functionality will be implemented soon. Please contact support.', 'error');
    }
    
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    hashPassword(password) {
        // Simple hash function for demo purposes
        // In production, use proper password hashing (bcrypt, etc.)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
    
    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }
    
    showMessage(message, type = 'info') {
        const errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) return;
        
        errorDiv.textContent = message;
        errorDiv.className = `error-message ${type === 'error' ? '' : 'hidden'}`;
        
        if (type === 'success') {
            errorDiv.style.background = '#e8f5e8';
            errorDiv.style.color = '#2e7d32';
            errorDiv.style.borderLeftColor = '#2e7d32';
        } else {
            errorDiv.style.background = '#ffebee';
            errorDiv.style.color = '#c62828';
            errorDiv.style.borderLeftColor = '#c62828';
        }
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    }
    
    redirectToApp() {
        window.location.href = 'app.html';
    }
    
    static logout() {
        localStorage.removeItem('notely_current_user');
        window.location.href = 'index.html';
    }
    
    static getCurrentUser() {
        return JSON.parse(localStorage.getItem('notely_current_user')) || null;
    }
    
    static isLoggedIn() {
        return !!localStorage.getItem('notely_current_user');
    }
}

// Initialize auth system when DOM is loaded
console.log('auth.js loaded');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - instantiating AuthSystem');
    new AuthSystem();
}); 