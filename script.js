// Notes App with AI Enhancement
class NotesApp {
    constructor() {
        // Check if user is logged in
        this.currentUser = AuthSystem.getCurrentUser();
        if (!this.currentUser) {
            // Only redirect if we're not already on the login page
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html') &&
                !window.location.pathname.includes('landing.html')) {
                window.location.href = 'login.html';
                return;
            }
            return;
        }
        
        // Load user-specific notes
        this.notes = JSON.parse(localStorage.getItem(`notes_${this.currentUser.id}`)) || [];
        this.currentEditingId = null;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Storage limit configuration (10MB)
        this.STORAGE_LIMIT = 10 * 1024 * 1024; // 10MB in bytes
        this.STORAGE_WARNING_THRESHOLD = 0.8; // 80% of limit
        
        // DOM elements
        this.noteTitleInput = document.getElementById('noteTitle');
        this.noteContentInput = document.getElementById('noteContent'); // now a div[contenteditable]
        this.addNoteBtn = document.getElementById('addNoteBtn');
        this.notesContainer = document.getElementById('notesContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.themeToggle = document.getElementById('themeToggle');
        console.log('Theme toggle element found:', this.themeToggle);
        this.fab = document.getElementById('fab');
        this.addNoteSection = document.getElementById('addNoteSection');
        this.particlesContainer = document.getElementById('particles');
        this.toolbar = document.getElementById('toolbar');
        this.fontFamily = document.getElementById('fontFamily');
        this.fontSize = document.getElementById('fontSize');
        this.fontColor = document.getElementById('fontColor');
        this.bgColor = document.getElementById('bgColor');
        this.storageFill = document.getElementById('storageFill');
        this.storageText = document.getElementById('storageText');
        this.userName = document.getElementById('userName');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // Initialize the app
        this.init();
    }
    
    init() {
        this.setupUserInfo();
        this.setupTheme();
        this.createParticles();
        this.autoDeleteOldNotes();
        this.checkStorageLimit();
        this.renderNotes();
        this.bindEvents();
        this.setupToolbar();
    }

    autoDeleteOldNotes() {
        const now = Date.now();
        const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
        let changed = false;
        this.notes = this.notes.filter(note => {
            // If note has no createdAt, set it to now (for legacy notes)
            if (!note.createdAt) {
                note.createdAt = note.id || now;
                changed = true;
            }
            return now - note.createdAt <= FIFTEEN_DAYS;
        });
        if (changed) this.saveNotes();
        // Remove notes older than 15 days
        const before = this.notes.length;
        this.notes = this.notes.filter(note => now - note.createdAt <= FIFTEEN_DAYS);
        if (this.notes.length !== before) this.saveNotes();
    }

    // Check and manage storage limits
    checkStorageLimit() {
        const currentSize = this.getStorageSize();
        const usagePercentage = (currentSize / this.STORAGE_LIMIT) * 100;
        
        // Update storage status display
        this.updateStorageDisplay(usagePercentage);
        
        if (currentSize >= this.STORAGE_LIMIT) {
            this.showStorageLimitExceeded();
        } else if (usagePercentage >= (this.STORAGE_WARNING_THRESHOLD * 100)) {
            this.showStorageWarning(usagePercentage);
        }
    }

    updateStorageDisplay(usagePercentage) {
        if (!this.storageFill) return;
        
        // Update progress bar
        this.storageFill.style.width = `${Math.min(usagePercentage, 100)}%`;
        
        // Update color based on usage
        this.storageFill.classList.remove('warning', 'danger');
        if (usagePercentage >= 100) {
            this.storageFill.classList.add('danger');
        } else if (usagePercentage >= 70) {
            this.storageFill.classList.add('warning');
        }
        
        // No storageText update
    }

    getStorageSize() {
        try {
            const notesData = JSON.stringify(this.notes);
            return new Blob([notesData]).size;
        } catch (error) {
            console.error('Error calculating storage size:', error);
            return 0;
        }
    }

    showStorageLimitExceeded() {
        const currentSize = this.getStorageSize();
        const exceededMB = ((currentSize - this.STORAGE_LIMIT) / (1024 * 1024)).toFixed(2);
        this.showNotification(`⚠️ Storage limit exceeded by ${exceededMB}MB! Please delete some notes to free space.`, 'error');
    }

    showStorageWarning(usagePercentage) {
        const remainingMB = ((this.STORAGE_LIMIT - this.getStorageSize()) / (1024 * 1024)).toFixed(2);
        this.showNotification(`Storage usage: ${usagePercentage.toFixed(1)}%. Only ${remainingMB}MB remaining.`, 'warning');
    }
    
    setupToolbar() {
        // Font family
        this.fontFamily.addEventListener('change', () => {
            const font = this.fontFamily.value;
            // If selection, apply to selection; else, apply to all content
            if (window.getSelection && window.getSelection().toString()) {
                document.execCommand('fontName', false, font);
                // Replace <font face=...> with span style
                this.replaceFontFace(font);
            } else {
                // Apply to all content
                this.noteContentInput.style.fontFamily = font;
            }
            this.noteContentInput.focus();
        });
        // Font size
        this.fontSize.addEventListener('change', () => {
            document.execCommand('fontSize', false, '7'); // use largest, then replace with real size
            // Replace all <font size="7"> with style
            this.replaceFontSize(this.fontSize.value);
            this.noteContentInput.focus();
        });
        // Font color
        this.fontColor.addEventListener('input', () => {
            if (window.getSelection && window.getSelection().toString()) {
                document.execCommand('foreColor', false, this.fontColor.value);
            } else {
                // Apply to all content
                this.noteContentInput.style.color = this.fontColor.value;
                // Optionally, wrap all content in a span for consistency
                // this.noteContentInput.innerHTML = `<span style='color:${this.fontColor.value}'>${this.noteContentInput.innerHTML}</span>`;
            }
            this.noteContentInput.focus();
        });
        // Background color
        this.bgColor.addEventListener('input', () => {
            document.execCommand('hiliteColor', false, this.bgColor.value);
            this.noteContentInput.focus();
        });
        // Style buttons
        this.toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.execCommand(btn.dataset.command, false, null);
                this.noteContentInput.focus();
            });
        });
    }
    
    replaceFontSize(size) {
        // Replace <font size="7"> with style="font-size:..."
        const html = this.noteContentInput.innerHTML;
        this.noteContentInput.innerHTML = html.replace(/<font size="7">([\s\S]*?)<\/font>/g, `<span style="font-size:${size}">$1</span>`);
    }
    
    replaceFontFace(font) {
        // Replace <font face=...> with span style
        const html = this.noteContentInput.innerHTML;
        this.noteContentInput.innerHTML = html.replace(/<font face="([^"]+)">([\s\S]*?)<\/font>/g, `<span style="font-family:${font}">$2</span>`);
    }
    
    bindEvents() {
        this.addNoteBtn.addEventListener('click', () => this.addOrUpdateNote());
        // Allow Ctrl+Enter to add note
        this.noteContentInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.addOrUpdateNote();
            }
        });
        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                console.log('Theme toggle clicked!');
                this.toggleTheme();
            });
        } else {
            console.error('Theme toggle element not found!');
        }
        // Floating action button
        this.fab.addEventListener('click', () => this.focusAddNote());
        // Export as PDF (only if button exists)
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportNotesAsPDF());
        }
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                this.toggleTheme();
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                this.focusAddNote();
            }
        });
        document.getElementById('noteModalClose').addEventListener('click', () => this.closeNoteModal());
        document.getElementById('noteModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('noteModal')) this.closeNoteModal();
        });
        // About Us modal logic
        const aboutBtn = document.getElementById('aboutBtn');
        const aboutModal = document.getElementById('aboutModal');
        const aboutModalClose = document.getElementById('aboutModalClose');
        if (aboutBtn && aboutModal && aboutModalClose) {
            aboutBtn.addEventListener('click', () => {
                aboutModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            });
            aboutModalClose.addEventListener('click', () => {
                aboutModal.classList.add('hidden');
                document.body.style.overflow = '';
            });
            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    aboutModal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Logout functionality
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    AuthSystem.logout();
                }
            });
        }
    }
    
    addOrUpdateNote() {
        const title = this.noteTitleInput.value.trim();
        const content = this.noteContentInput.innerHTML.trim();
        if (!title || !content || content === '<br>') {
            alert('Please enter both title and content for your note.');
            return;
        }
        
        // Check storage limit before adding new note
        if (this.currentEditingId === null) {
            const newNote = {
                id: Date.now(),
                title: title,
                content: content,
                date: new Date().toLocaleString(),
                improved: false,
                createdAt: Date.now()
            };
            
            // Simulate adding the note to check if it would exceed limit
            const tempNotes = [newNote, ...this.notes];
            const tempSize = new Blob([JSON.stringify(tempNotes)]).size;
            
            if (tempSize >= this.STORAGE_LIMIT) {
                const exceededMB = ((tempSize - this.STORAGE_LIMIT) / (1024 * 1024)).toFixed(2);
                this.showNotification(`⚠️ Cannot add note - would exceed storage limit by ${exceededMB}MB! Please delete some notes first.`, 'error');
                return;
            }
        }
        
        if (this.currentEditingId !== null) {
            // Update
            const noteIndex = this.notes.findIndex(note => note.id === this.currentEditingId);
            if (noteIndex !== -1) {
                this.notes[noteIndex].title = title;
                this.notes[noteIndex].content = content;
                this.notes[noteIndex].date = new Date().toLocaleString();
                this.notes[noteIndex].improved = false;
                // Do not update createdAt
                this.saveNotes();
                this.renderNotes();
                this.clearForm();
            }
        } else {
            // Add
            const now = Date.now();
            const note = {
                id: now,
                title: title,
                content: content,
                date: new Date().toLocaleString(),
                improved: false,
                createdAt: now
            };
            this.notes.unshift(note);
            this.saveNotes();
            this.renderNotes();
            this.clearForm();
            
            // Check storage after adding
            this.checkStorageLimit();
        }
    }
    
    deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== id);
            this.saveNotes();
            this.renderNotes();
        }
    }
    
    editNote(id) {
        const note = this.notes.find(note => note.id === id);
        if (!note) return;
        this.currentEditingId = id;
        this.noteTitleInput.value = note.title;
        this.noteContentInput.innerHTML = note.content;
        this.addNoteBtn.textContent = 'Update Note';
        this.noteTitleInput.scrollIntoView({ behavior: 'smooth' });
        this.noteTitleInput.focus();
    }
    
    async improveNoteWithAI(id) {
        const note = this.notes.find(note => note.id === id);
        if (!note) return;
        // Show loading overlay
        this.showLoading();
        try {
            // Strip HTML tags for AI improvement, but keep line breaks
            const plainText = note.content.replace(/<[^>]+>/g, '').replace(/\n/g, '\n');
            
            console.log('Sending request to improve note:', { content: plainText.substring(0, 100) + '...' });
            
            const response = await fetch('/api/improve-note', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: plainText })
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.improvedContent) {
                const noteIndex = this.notes.findIndex(note => note.id === id);
                if (noteIndex !== -1) {
                    this.notes[noteIndex].content = data.improvedContent;
                    this.notes[noteIndex].improved = true;
                    this.notes[noteIndex].date = new Date().toLocaleString();
                    this.saveNotes();
                    this.renderNotes();
                    this.showNotification('Note improved successfully! ✨', 'success');
                }
            } else {
                console.error('Invalid response format:', data);
                throw new Error('Invalid response format from API - no improvedContent field');
            }
        } catch (error) {
            console.error('Error improving note with AI:', error);
            this.showNotification(`Failed to improve note: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // Set background color based on type
        if (type === 'success') {
            notification.style.background = '#4CAF50';
        } else if (type === 'error') {
            notification.style.background = '#f44336';
        } else if (type === 'warning') {
            notification.style.background = '#ff9800';
        } else {
            notification.style.background = '#2196F3';
        }
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    clearForm() {
        this.noteTitleInput.value = '';
        this.noteContentInput.innerHTML = '';
        this.addNoteBtn.textContent = 'Add Note';
        this.currentEditingId = null;
    }
    
    setupUserInfo() {
        if (this.userName) {
            this.userName.textContent = `Welcome, ${this.currentUser.fullName}`;
        }
    }
    
    saveNotes() {
        localStorage.setItem(`notes_${this.currentUser.id}`, JSON.stringify(this.notes));
        // Check storage limit after saving
        this.checkStorageLimit();
    }
    
    renderNotes() {
        if (this.notes.length === 0) {
            this.notesContainer.innerHTML = '<div class="empty-state">No notes yet. Create your first note above! 📝</div>';
            return;
        }
        this.notesContainer.innerHTML = this.notes.map((note, index) => {
            // Render note content with preview logic
            const previewId = `note-content-${note.id}`;
            const isLong = this.isContentLong(note.content);
            return `
            <div class="note-card note-card-glass" data-id="${note.id}" style="animation-delay: ${index * 0.1}s;">
                <div class="note-title">${this.escapeHtml(note.title)}</div>
                <span class="note-date">${note.date}</span>
                <div class="note-content" id="${previewId}">${note.content}</div>
                ${isLong ? `<button class="show-more-btn" onclick="notesApp.openNoteModal(${note.id})">Show more</button>` : ''}
                <div class="note-actions">
                    <button class="note-btn edit" onclick="notesApp.editNote(${note.id})">✏️ Edit</button>
                    <button class="note-btn ai" onclick="notesApp.improveNoteWithAI(${note.id})">🤖 Improve with AI</button>
                    <button class="note-btn delete" onclick="notesApp.deleteNote(${note.id})">🗑️ Delete</button>
                    <button class="note-btn pdf" onclick="notesApp.exportSingleNoteAsPDF(${note.id})" title="Export this note as PDF">📄 Export as PDF</button>
                </div>
            </div>
        `; }).join('');
    }

    // Modal logic
    openNoteModal(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        document.getElementById('modalNoteTitle').textContent = note.title;
        document.getElementById('modalNoteDate').textContent = note.date;
        document.getElementById('modalNoteContent').innerHTML = note.content + `<div class='modal-export-btn-wrap'><button class='btn btn-export' onclick='notesApp.exportSingleNoteAsPDF(${note.id})'>📄 Export as PDF</button></div>`;
        document.getElementById('noteModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    closeNoteModal() {
        document.getElementById('noteModal').classList.add('hidden');
        document.body.style.overflow = '';
    }

    isContentLong(html) {
        // Create a temp element to measure height
        const temp = document.createElement('div');
        temp.className = 'note-content';
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        temp.style.pointerEvents = 'none';
        temp.style.maxHeight = 'none';
        temp.innerHTML = html;
        document.body.appendChild(temp);
        const isLong = temp.scrollHeight > 120;
        document.body.removeChild(temp);
        return isLong;
    }

    toggleExpand(id, btn) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('expanded');
        btn.textContent = el.classList.contains('expanded') ? 'Show less' : 'Show more';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    setupTheme() {
        if (!this.themeToggle) return;
        
        if (this.isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeToggle.textContent = '☀️';
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            this.themeToggle.textContent = '🌙';
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.setupTheme();
        
        // Add animation effect
        if (this.themeToggle) {
            this.themeToggle.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                this.themeToggle.style.transform = '';
            }, 300);
        }
    }
    
    focusAddNote() {
        this.addNoteSection.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
            this.noteTitleInput.focus();
        }, 500);
        
        // Add pulse animation
        this.addNoteSection.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
            this.addNoteSection.style.animation = '';
        }, 500);
    }
    
    createParticles() {
        const particleCount = 50;
        
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
            
            this.particlesContainer.appendChild(particle);
        }
    }

    async exportNotesAsPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');
            
            // Create a hidden container for PDF export
            const exportContainer = document.createElement('div');
            exportContainer.style.cssText = `
                position: absolute;
                left: -9999px;
                top: -9999px;
                width: 700px;
                padding: 24px;
                background: #fff;
                font-family: 'Roboto', 'Times New Roman', Arial, sans-serif;
                color: #000;
                line-height: 1.6;
            `;
            
            exportContainer.innerHTML = `
                <h1 style="font-size: 24px; margin-bottom: 20px; color: #333; text-align: center;">My Notes</h1>
                ${this.notes.map(note => `
                    <div style="margin-bottom: 32px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
                        <h2 style="font-size: 20px; margin: 0 0 8px 0; color: #333;">${this.escapeHtml(note.title)}</h2>
                        <div style="font-size: 15px; color: #333; white-space: pre-wrap;">${this.escapeHtml(note.content.replace(/<[^>]+>/g, ''))}</div>
                    </div>
                `).join('')}
            `;
            
            document.body.appendChild(exportContainer);
            
            // Use html2canvas to capture the content
            const canvas = await html2canvas(exportContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                width: 700,
                height: exportContainer.scrollHeight,
                useCORS: true,
                allowTaint: true
            });
            
            document.body.removeChild(exportContainer);
            
            // Add the canvas to PDF
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('MyNotes.pdf');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showNotification('Failed to export PDF. Please try again.', 'error');
        }
    }

    async exportSingleNoteAsPDF(noteId) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');
            const note = this.notes.find(n => n.id === noteId);
            if (!note) return;
            
            // Create a hidden container for PDF export
            const exportContainer = document.createElement('div');
            exportContainer.style.cssText = `
                position: absolute;
                left: -9999px;
                top: -9999px;
                width: 600px;
                padding: 24px;
                background: #fff;
                font-family: 'Roboto', 'Times New Roman', Arial, sans-serif;
                color: #000;
                line-height: 1.6;
            `;
            
            exportContainer.innerHTML = `
                <h1 style="font-size: 24px; margin-bottom: 20px; color: #333; text-align: center;">${this.escapeHtml(note.title)}</h1>
                <div style="font-size: 16px; color: #333; white-space: pre-wrap; line-height: 1.8;">${this.escapeHtml(note.content.replace(/<[^>]+>/g, ''))}</div>
            `;
            
            document.body.appendChild(exportContainer);
            
            // Use html2canvas to capture the content
            const canvas = await html2canvas(exportContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                width: 600,
                height: exportContainer.scrollHeight,
                useCORS: true,
                allowTaint: true
            });
            
            document.body.removeChild(exportContainer);
            
            // Add the canvas to PDF
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save((note.title || 'Note') + '.pdf');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showNotification('Failed to export PDF. Please try again.', 'error');
        }
    }
}

// Initialize the app when DOM is loaded
let notesApp;

document.addEventListener('DOMContentLoaded', () => {
    notesApp = new NotesApp();
    window.notesApp = notesApp;
    // Page style selector logic
    const pageStyleSelect = document.getElementById('pageStyleSelect');
    const htmlEl = document.documentElement;
    if (pageStyleSelect) {
        // Set initial value from localStorage
        pageStyleSelect.value = localStorage.getItem('pageStyle') || 'classic';
        // Apply initial class
        htmlEl.classList.remove('page-style-classic', 'page-style-aurora', 'page-style-minimal');
        htmlEl.classList.add('page-style-' + pageStyleSelect.value);
        pageStyleSelect.addEventListener('change', (e) => {
            localStorage.setItem('pageStyle', e.target.value);
            htmlEl.classList.remove('page-style-classic', 'page-style-aurora', 'page-style-minimal');
            htmlEl.classList.add('page-style-' + e.target.value);
        });
    }
}); 