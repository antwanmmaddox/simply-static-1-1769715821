/**
 * Enhanced Responsive JavaScript for Teresa Edwards Website
 * Cross-browser compatibility and mobile optimization
 */

(function() {
    'use strict';

    // Polyfill for older browsers
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || 
                                    Element.prototype.webkitMatchesSelector;
    }

    if (!Element.prototype.closest) {
        Element.prototype.closest = function(s) {
            var el = this;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }

    // Debounce function for performance
    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    // Responsive utilities
    var ResponsiveUtils = {
        // Breakpoints matching CSS
        breakpoints: {
            xs: 479,
            sm: 767,
            md: 1023,
            lg: 1199,
            xl: 1200
        },

        // Get current breakpoint
        getCurrentBreakpoint: function() {
            var width = window.innerWidth || document.documentElement.clientWidth;
            if (width <= this.breakpoints.xs) return 'xs';
            if (width <= this.breakpoints.sm) return 'sm';
            if (width <= this.breakpoints.md) return 'md';
            if (width <= this.breakpoints.lg) return 'lg';
            return 'xl';
        },

        // Check if mobile
        isMobile: function() {
            return this.getCurrentBreakpoint() === 'xs' || this.getCurrentBreakpoint() === 'sm';
        },

        // Check if tablet
        isTablet: function() {
            return this.getCurrentBreakpoint() === 'md';
        },

        // Check if desktop
        isDesktop: function() {
            return this.getCurrentBreakpoint() === 'lg' || this.getCurrentBreakpoint() === 'xl';
        }
    };

    // Mobile navigation enhancements
    function initMobileNavigation() {
        var mobileToggle = document.querySelector('.ast-mobile-menu-trigger-minimal');
        var mobileMenu = document.querySelector('.main-header-menu');
        
        if (mobileToggle && mobileMenu) {
            mobileToggle.addEventListener('click', function(e) {
                e.preventDefault();
                var isOpen = mobileMenu.classList.contains('mobile-menu-open');
                
                if (isOpen) {
                    mobileMenu.classList.remove('mobile-menu-open');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('mobile-menu-active');
                } else {
                    mobileMenu.classList.add('mobile-menu-open');
                    mobileToggle.setAttribute('aria-expanded', 'true');
                    document.body.classList.add('mobile-menu-active');
                }
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.main-header-menu') && 
                    !e.target.closest('.ast-mobile-menu-trigger-minimal') &&
                    mobileMenu.classList.contains('mobile-menu-open')) {
                    mobileMenu.classList.remove('mobile-menu-open');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('mobile-menu-active');
                }
            });

            // Close mobile menu on escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && mobileMenu.classList.contains('mobile-menu-open')) {
                    mobileMenu.classList.remove('mobile-menu-open');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    document.body.classList.remove('mobile-menu-active');
                    mobileToggle.focus();
                }
            });
        }
    }

    // Touch-friendly interactions
    function initTouchEnhancements() {
        // Add touch class to body for CSS targeting
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.body.classList.add('touch-device');
        }

        // Improve button touch targets
        var buttons = document.querySelectorAll('button, .wp-block-button__link, .elementor-button, .ast-button');
        buttons.forEach(function(button) {
            if (ResponsiveUtils.isMobile()) {
                var rect = button.getBoundingClientRect();
                if (rect.height < 44) {
                    button.style.minHeight = '44px';
                    button.style.display = 'flex';
                    button.style.alignItems = 'center';
                    button.style.justifyContent = 'center';
                }
            }
        });
    }

    // Responsive images with lazy loading
    function initResponsiveImages() {
        var images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            var imageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(function(img) {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            images.forEach(function(img) {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    // Responsive video embeds
    function initResponsiveVideos() {
        var videos = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');
        
        videos.forEach(function(video) {
            var wrapper = document.createElement('div');
            wrapper.className = 'video-container';
            video.parentNode.insertBefore(wrapper, video);
            wrapper.appendChild(video);
        });
    }

    // Form enhancements for mobile
    function initFormEnhancements() {
        var forms = document.querySelectorAll('form');
        
        forms.forEach(function(form) {
            var inputs = form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(function(input) {
                // Prevent zoom on iOS
                if (ResponsiveUtils.isMobile() && input.type !== 'file') {
                    if (parseFloat(getComputedStyle(input).fontSize) < 16) {
                        input.style.fontSize = '16px';
                    }
                }

                // Add proper input types for better mobile keyboards
                if (input.name && input.type === 'text') {
                    if (input.name.toLowerCase().includes('email')) {
                        input.type = 'email';
                    } else if (input.name.toLowerCase().includes('phone') || 
                              input.name.toLowerCase().includes('tel')) {
                        input.type = 'tel';
                    } else if (input.name.toLowerCase().includes('url') || 
                              input.name.toLowerCase().includes('website')) {
                        input.type = 'url';
                    }
                }
            });
        });
    }

    // WooCommerce responsive enhancements
    function initWooCommerceEnhancements() {
        // Responsive product gallery
        var productGallery = document.querySelector('.woocommerce-product-gallery');
        if (productGallery && ResponsiveUtils.isMobile()) {
            productGallery.classList.add('mobile-gallery');
        }

        // Responsive cart table
        var cartTable = document.querySelector('.woocommerce-cart-form table');
        if (cartTable && ResponsiveUtils.isMobile()) {
            cartTable.classList.add('mobile-cart-table');
        }

        // Quantity input improvements
        var quantityInputs = document.querySelectorAll('.quantity input[type="number"]');
        quantityInputs.forEach(function(input) {
            if (ResponsiveUtils.isMobile()) {
                input.style.minWidth = '60px';
                input.style.textAlign = 'center';
            }
        });
    }

    // Accessibility enhancements
    function initAccessibilityEnhancements() {
        // Skip link
        var skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Focus management for modals/popups
        var popups = document.querySelectorAll('.pum-container');
        popups.forEach(function(popup) {
            var closeButton = popup.querySelector('.pum-close');
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    // Return focus to trigger element if available
                    var trigger = document.querySelector('[data-popup-trigger]');
                    if (trigger) {
                        trigger.focus();
                    }
                });
            }
        });

        // Keyboard navigation for custom elements
        var customButtons = document.querySelectorAll('[role="button"]:not(button)');
        customButtons.forEach(function(button) {
            button.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
    }

    // Performance optimizations
    function initPerformanceOptimizations() {
        // Lazy load non-critical CSS
        var nonCriticalCSS = [
            '/wp-content/themes/astra/assets/css/responsive-enhancements.css'
        ];

        nonCriticalCSS.forEach(function(href) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.media = 'print';
            link.onload = function() {
                this.media = 'all';
            };
            document.head.appendChild(link);
        });

        // Preload critical resources
        var criticalResources = [
            '/wp-content/themes/astra/assets/css/minified/frontend.min.css'
        ];

        criticalResources.forEach(function(href) {
            var link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    // Orientation change handler
    function handleOrientationChange() {
        // Force layout recalculation on orientation change
        setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
        }, 100);

        // Update viewport height for mobile browsers
        if (ResponsiveUtils.isMobile()) {
            var vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', vh + 'px');
        }
    }

    // Resize handler
    var handleResize = debounce(function() {
        var currentBreakpoint = ResponsiveUtils.getCurrentBreakpoint();
        document.body.className = document.body.className.replace(/breakpoint-\w+/g, '');
        document.body.classList.add('breakpoint-' + currentBreakpoint);

        // Update touch enhancements
        initTouchEnhancements();

        // Update WooCommerce enhancements
        initWooCommerceEnhancements();

        // Update viewport height
        if (ResponsiveUtils.isMobile()) {
            var vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', vh + 'px');
        }
    }, 250);

    // Initialize everything when DOM is ready
    function init() {
        // Set initial breakpoint class
        var currentBreakpoint = ResponsiveUtils.getCurrentBreakpoint();
        document.body.classList.add('breakpoint-' + currentBreakpoint);

        // Set initial viewport height
        if (ResponsiveUtils.isMobile()) {
            var vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', vh + 'px');
        }

        // Initialize all enhancements
        initMobileNavigation();
        initTouchEnhancements();
        initResponsiveImages();
        initResponsiveVideos();
        initFormEnhancements();
        initWooCommerceEnhancements();
        initAccessibilityEnhancements();
        initPerformanceOptimizations();

        // Event listeners
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);

        // Custom event for other scripts to hook into
        window.dispatchEvent(new CustomEvent('responsiveEnhancementsLoaded', {
            detail: { ResponsiveUtils: ResponsiveUtils }
        }));
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose utilities globally
    window.TeresaEdwardsResponsive = {
        utils: ResponsiveUtils,
        init: init
    };

})();