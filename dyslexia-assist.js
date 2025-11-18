// Dyslexia Assist functionality

class DyslexiaAssist {
    constructor() {
        // Toggle elements
        this.applyAllToggle = document.getElementById('apply-all-toggle');
        this.headersToggle = document.getElementById('headers-toggle');
        this.paragraphsToggle = document.getElementById('paragraphs-toggle');
        this.buttonsToggle = document.getElementById('buttons-toggle');
        this.linksToggle = document.getElementById('links-toggle');
        this.labelsToggle = document.getElementById('labels-toggle');
        this.navigationToggle = document.getElementById('navigation-toggle');
        this.inputsToggle = document.getElementById('inputs-toggle');
        
        // Settings object
        this.settings = {
            applyAll: false,
            headers: false,
            paragraphs: false,
            buttons: false,
            links: false,
            labels: false,
            navigation: false,
            inputs: false
        };
        
        // CSS class name for OpenDyslexic
        this.fontClass = 'font-opendyslexic';
        
        this.init();
    }

    init() {
        // Load saved settings from localStorage
        this.loadSettings();
        
        // Apply initial settings
        this.applySettings();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Helper function to set up toggle
        const setupToggle = (toggle, settingKey) => {
            if (!toggle) return;
            
            toggle.addEventListener('change', () => {
                this.settings[settingKey] = toggle.checked;
                this.saveSettings();
                this.applySettings();
            });
        };
        
        // Apply All toggle
        setupToggle(this.applyAllToggle, 'applyAll');
        
        // Individual toggles
        setupToggle(this.headersToggle, 'headers');
        setupToggle(this.paragraphsToggle, 'paragraphs');
        setupToggle(this.buttonsToggle, 'buttons');
        setupToggle(this.linksToggle, 'links');
        setupToggle(this.labelsToggle, 'labels');
        setupToggle(this.navigationToggle, 'navigation');
        setupToggle(this.inputsToggle, 'inputs');
    }
    
    applySettings() {
        // If "Apply All" is enabled, apply font to body
        if (this.settings.applyAll) {
            document.body.classList.add(this.fontClass);
            // Disable individual toggles visually (but keep their state)
            this.disableIndividualToggles(true);
        } else {
            document.body.classList.remove(this.fontClass);
            this.disableIndividualToggles(false);
            
            // Apply individual settings
            this.applyIndividualSettings();
        }
        
        // Always update preview section
        this.updatePreview();
        
        // Update toggle states in UI (after applying settings to avoid conflicts)
        this.updateToggleStates();
    }
    
    applyIndividualSettings() {
        // Headers (h1, h2, h3, h4, h5, h6)
        if (this.settings.headers) {
            document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
        
        // Paragraphs
        if (this.settings.paragraphs) {
            document.querySelectorAll('p').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('p').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
        
        // Buttons
        if (this.settings.buttons) {
            document.querySelectorAll('button, .btn').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('button, .btn').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
        
        // Links
        if (this.settings.links) {
            document.querySelectorAll('a').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('a').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
        
        // Labels
        if (this.settings.labels) {
            document.querySelectorAll('label').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('label').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
        
        // Navigation
        if (this.settings.navigation) {
            document.querySelectorAll('nav, .nav-link, .nav-logo').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('nav, .nav-link, .nav-logo').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
        
        // Input fields
        if (this.settings.inputs) {
            document.querySelectorAll('input, textarea, select').forEach(el => {
                el.classList.add(this.fontClass);
            });
        } else {
            document.querySelectorAll('input, textarea, select').forEach(el => {
                el.classList.remove(this.fontClass);
            });
        }
    }
    
    updatePreview() {
        const previewSection = document.querySelector('.preview-content');
        if (!previewSection) return;
        
        // Clear all font classes from preview
        previewSection.querySelectorAll('*').forEach(el => {
            el.classList.remove(this.fontClass);
        });
        
        // Apply "Apply All" if enabled
        if (this.settings.applyAll) {
            previewSection.classList.add(this.fontClass);
        } else {
            previewSection.classList.remove(this.fontClass);
            
            // Apply individual settings to preview elements
            if (this.settings.headers) {
                previewSection.querySelectorAll('h3').forEach(el => {
                    el.classList.add(this.fontClass);
                });
            }
            
            if (this.settings.paragraphs) {
                previewSection.querySelectorAll('p').forEach(el => {
                    el.classList.add(this.fontClass);
                });
            }
            
            if (this.settings.buttons) {
                previewSection.querySelectorAll('button, .btn').forEach(el => {
                    el.classList.add(this.fontClass);
                });
            }
            
            if (this.settings.links) {
                previewSection.querySelectorAll('a').forEach(el => {
                    el.classList.add(this.fontClass);
                });
            }
            
            if (this.settings.labels) {
                previewSection.querySelectorAll('label').forEach(el => {
                    el.classList.add(this.fontClass);
                });
            }
            
            if (this.settings.inputs) {
                previewSection.querySelectorAll('input, textarea').forEach(el => {
                    el.classList.add(this.fontClass);
                });
            }
        }
    }
    
    updateToggleStates() {
        if (this.applyAllToggle) {
            this.applyAllToggle.checked = this.settings.applyAll;
        }
        if (this.headersToggle) {
            this.headersToggle.checked = this.settings.headers;
        }
        if (this.paragraphsToggle) {
            this.paragraphsToggle.checked = this.settings.paragraphs;
        }
        if (this.buttonsToggle) {
            this.buttonsToggle.checked = this.settings.buttons;
        }
        if (this.linksToggle) {
            this.linksToggle.checked = this.settings.links;
        }
        if (this.labelsToggle) {
            this.labelsToggle.checked = this.settings.labels;
        }
        if (this.navigationToggle) {
            this.navigationToggle.checked = this.settings.navigation;
        }
        if (this.inputsToggle) {
            this.inputsToggle.checked = this.settings.inputs;
        }
    }
    
    disableIndividualToggles(disable) {
        const toggles = [
            this.headersToggle,
            this.paragraphsToggle,
            this.buttonsToggle,
            this.linksToggle,
            this.labelsToggle,
            this.navigationToggle,
            this.inputsToggle
        ];
        
        toggles.forEach(toggle => {
            if (toggle) {
                toggle.disabled = disable;
                const settingItem = toggle.closest('.setting-item');
                if (settingItem) {
                    if (disable) {
                        settingItem.classList.add('setting-disabled');
                    } else {
                        settingItem.classList.remove('setting-disabled');
                    }
                }
            }
        });
    }
    
    saveSettings() {
        try {
            localStorage.setItem('dyslexiaAssistSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Could not save settings to localStorage:', e);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('dyslexiaAssistSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Could not load settings from localStorage:', e);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DyslexiaAssist();
    });
} else {
    new DyslexiaAssist();
}

