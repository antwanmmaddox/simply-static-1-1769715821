<?php
/**
 * Astra Theme Functions with Responsive Enhancements
 * Teresa Edwards Website
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Theme setup
 */
function astra_theme_setup() {
    // Add theme support for responsive embeds
    add_theme_support('responsive-embeds');
    
    // Add theme support for HTML5
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script'
    ));
    
    // Add theme support for post thumbnails
    add_theme_support('post-thumbnails');
    
    // Add theme support for custom logo
    add_theme_support('custom-logo', array(
        'height'      => 120,
        'width'       => 120,
        'flex-height' => true,
        'flex-width'  => true,
    ));
    
    // Add theme support for title tag
    add_theme_support('title-tag');
    
    // Add theme support for automatic feed links
    add_theme_support('automatic-feed-links');
    
    // Add theme support for wide alignment
    add_theme_support('align-wide');
    
    // Add theme support for editor styles
    add_theme_support('editor-styles');
    
    // Add theme support for custom line height
    add_theme_support('custom-line-height');
    
    // Add theme support for custom units
    add_theme_support('custom-units');
}
add_action('after_setup_theme', 'astra_theme_setup');

/**
 * Include responsive enhancements
 */
require_once get_template_directory() . '/inc/responsive-enhancements.php';

/**
 * Enqueue theme styles and scripts
 */
function astra_theme_scripts() {
    // Main theme stylesheet
    wp_enqueue_style('astra-theme-css', get_template_directory_uri() . '/assets/css/minified/frontend.min.css', array(), '4.12.1');
    
    // Theme JavaScript
    wp_enqueue_script('astra-theme-js', get_template_directory_uri() . '/assets/js/minified/frontend.min.js', array('jquery'), '4.12.1', true);
    
    // Comment reply script
    if (is_singular() && comments_open() && get_option('thread_comments')) {
        wp_enqueue_script('comment-reply');
    }
}
add_action('wp_enqueue_scripts', 'astra_theme_scripts');

/**
 * Add responsive navigation menu
 */
function astra_register_nav_menus() {
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'astra'),
        'mobile'  => __('Mobile Menu', 'astra'),
        'footer'  => __('Footer Menu', 'astra'),
    ));
}
add_action('init', 'astra_register_nav_menus');

/**
 * Add widget areas
 */
function astra_widgets_init() {
    register_sidebar(array(
        'name'          => __('Primary Sidebar', 'astra'),
        'id'            => 'sidebar-1',
        'description'   => __('Add widgets here.', 'astra'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));
    
    register_sidebar(array(
        'name'          => __('Footer Widget 1', 'astra'),
        'id'            => 'footer-1',
        'description'   => __('Add widgets here.', 'astra'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));
    
    register_sidebar(array(
        'name'          => __('Footer Widget 2', 'astra'),
        'id'            => 'footer-2',
        'description'   => __('Add widgets here.', 'astra'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));
    
    register_sidebar(array(
        'name'          => __('Footer Widget 3', 'astra'),
        'id'            => 'footer-3',
        'description'   => __('Add widgets here.', 'astra'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));
}
add_action('widgets_init', 'astra_widgets_init');

/**
 * Customize excerpt length
 */
function astra_excerpt_length($length) {
    return 20;
}
add_filter('excerpt_length', 'astra_excerpt_length', 999);

/**
 * Customize excerpt more
 */
function astra_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'astra_excerpt_more');

/**
 * Add custom CSS for responsive design
 */
function astra_custom_css() {
    ?>
    <style type="text/css">
        /* Responsive base styles */
        .ast-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Mobile-first responsive design */
        @media (max-width: 768px) {
            .ast-container {
                padding: 0 15px;
            }
            
            .site-header {
                padding: 10px 0;
            }
            
            .main-header-menu {
                display: none;
            }
            
            .ast-mobile-menu-trigger-minimal {
                display: block;
            }
            
            .elementor-section {
                padding: 30px 0 !important;
            }
            
            .elementor-container {
                padding: 0 15px !important;
            }
            
            .elementor-column {
                width: 100% !important;
                margin-bottom: 20px !important;
            }
        }
        
        @media (min-width: 769px) {
            .main-header-menu {
                display: flex;
            }
            
            .ast-mobile-menu-trigger-minimal {
                display: none;
            }
        }
        
        /* WooCommerce responsive styles */
        @media (max-width: 768px) {
            .woocommerce ul.products {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
            
            .woocommerce .products .product {
                width: 100% !important;
                margin: 0 !important;
            }
        }
        
        @media (max-width: 480px) {
            .woocommerce ul.products {
                grid-template-columns: 1fr;
            }
        }
        
        /* Form responsive styles */
        @media (max-width: 768px) {
            .wpcf7-form input[type="text"],
            .wpcf7-form input[type="email"],
            .wpcf7-form input[type="tel"],
            .wpcf7-form textarea {
                width: 100%;
                font-size: 16px;
                padding: 12px;
            }
            
            .wpcf7-form input[type="submit"] {
                width: 100%;
                padding: 15px;
                font-size: 16px;
            }
        }
        
        /* Button responsive styles */
        @media (max-width: 768px) {
            .wp-block-button .wp-block-button__link,
            .elementor-button,
            .ast-button {
                padding: 12px 20px;
                font-size: 14px;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
        }
        
        /* Typography responsive styles */
        @media (max-width: 768px) {
            h1, .entry-content h1 {
                font-size: 2.5rem !important;
                line-height: 1.2;
            }
            
            h2, .entry-content h2 {
                font-size: 2rem !important;
                line-height: 1.3;
            }
            
            h3, .entry-content h3 {
                font-size: 1.5rem !important;
                line-height: 1.3;
            }
            
            body, p {
                font-size: 14px;
                line-height: 1.6;
            }
        }
        
        /* Image responsive styles */
        img {
            max-width: 100%;
            height: auto;
        }
        
        /* Video responsive styles */
        .wp-block-embed,
        .wp-block-embed__wrapper {
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            overflow: hidden;
        }
        
        .wp-block-embed iframe,
        .wp-block-embed object,
        .wp-block-embed embed {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        
        /* Accessibility improvements */
        .skip-link {
            position: absolute;
            left: -9999px;
            top: auto;
            width: 1px;
            height: 1px;
            overflow: hidden;
        }
        
        .skip-link:focus {
            position: fixed;
            top: 0;
            left: 0;
            width: auto;
            height: auto;
            padding: 8px 16px;
            background: #000;
            color: #fff;
            text-decoration: none;
            z-index: 999999;
        }
        
        /* Focus styles */
        a:focus,
        button:focus,
        input:focus,
        textarea:focus,
        select:focus {
            outline: 2px solid #0073aa;
            outline-offset: 2px;
        }
    </style>
    <?php
}
add_action('wp_head', 'astra_custom_css');

/**
 * Add responsive JavaScript
 */
function astra_responsive_js() {
    ?>
    <script type="text/javascript">
        document.addEventListener('DOMContentLoaded', function() {
            // Mobile menu toggle
            var mobileToggle = document.querySelector('.ast-mobile-menu-trigger-minimal');
            var mobileMenu = document.querySelector('.main-header-menu');
            
            if (mobileToggle && mobileMenu) {
                mobileToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    mobileMenu.classList.toggle('mobile-menu-open');
                    mobileToggle.setAttribute('aria-expanded', 
                        mobileMenu.classList.contains('mobile-menu-open') ? 'true' : 'false'
                    );
                });
            }
            
            // Responsive image loading
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
            }
            
            // Viewport height fix for mobile
            function setVH() {
                var vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', vh + 'px');
            }
            
            setVH();
            window.addEventListener('resize', setVH);
            window.addEventListener('orientationchange', function() {
                setTimeout(setVH, 100);
            });
            
            // Touch device detection
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                document.body.classList.add('touch-device');
            }
            
            // Form enhancements for mobile
            var inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(function(input) {
                if (window.innerWidth <= 768 && input.type !== 'file') {
                    if (parseFloat(getComputedStyle(input).fontSize) < 16) {
                        input.style.fontSize = '16px';
                    }
                }
            });
        });
    </script>
    <?php
}
add_action('wp_footer', 'astra_responsive_js');

/**
 * Optimize for mobile performance
 */
function astra_mobile_optimizations() {
    if (wp_is_mobile()) {
        // Remove unnecessary scripts on mobile
        add_action('wp_enqueue_scripts', function() {
            if (!is_admin()) {
                wp_dequeue_script('jquery-migrate');
            }
        }, 100);
        
        // Add mobile-specific meta tags
        add_action('wp_head', function() {
            echo '<meta name="format-detection" content="telephone=no">';
            echo '<meta name="mobile-web-app-capable" content="yes">';
            echo '<meta name="apple-mobile-web-app-capable" content="yes">';
            echo '<meta name="apple-mobile-web-app-status-bar-style" content="default">';
        });
    }
}
add_action('init', 'astra_mobile_optimizations');

/**
 * Add structured data for better SEO
 */
function astra_structured_data() {
    if (is_front_page()) {
        $schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'Person',
            'name' => 'Teresa Edwards',
            'description' => '5x Olympic basketball player and inspirational speaker',
            'url' => home_url(),
            'sameAs' => array(
                // Add social media URLs here
            ),
            'jobTitle' => 'Olympic Basketball Player, Speaker, Author',
            'knowsAbout' => array('Basketball', 'Leadership', 'Motivation', 'Olympic Sports'),
            'award' => array('5x Olympic Medalist', 'Basketball Hall of Fame')
        );
        
        echo '<script type="application/ld+json">' . json_encode($schema) . '</script>';
    }
}
add_action('wp_head', 'astra_structured_data');

/**
 * Customize login page for branding
 */
function astra_custom_login_logo() {
    ?>
    <style type="text/css">
        #login h1 a, .login h1 a {
            background-image: url(<?php echo get_template_directory_uri(); ?>/assets/images/logo.png);
            height: 80px;
            width: 320px;
            background-size: contain;
            background-repeat: no-repeat;
            padding-bottom: 30px;
        }
    </style>
    <?php
}
add_action('login_enqueue_scripts', 'astra_custom_login_logo');

/**
 * Security enhancements
 */
function astra_security_enhancements() {
    // Remove WordPress version from head
    remove_action('wp_head', 'wp_generator');
    
    // Remove RSD link
    remove_action('wp_head', 'rsd_link');
    
    // Remove wlwmanifest link
    remove_action('wp_head', 'wlwmanifest_link');
    
    // Remove shortlink
    remove_action('wp_head', 'wp_shortlink_wp_head');
    
    // Disable XML-RPC
    add_filter('xmlrpc_enabled', '__return_false');
    
    // Remove REST API links from head
    remove_action('wp_head', 'rest_output_link_wp_head');
    remove_action('wp_head', 'wp_oembed_add_discovery_links');
}
add_action('init', 'astra_security_enhancements');

/**
 * Performance optimizations
 */
function astra_performance_optimizations() {
    // Remove emoji scripts
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    
    // Remove block library CSS if not using Gutenberg
    if (!is_admin()) {
        wp_dequeue_style('wp-block-library');
        wp_dequeue_style('wp-block-library-theme');
    }
    
    // Defer JavaScript loading
    add_filter('script_loader_tag', function($tag, $handle, $src) {
        $defer_scripts = array('jquery', 'jquery-core', 'jquery-migrate');
        if (in_array($handle, $defer_scripts)) {
            return str_replace('<script ', '<script defer ', $tag);
        }
        return $tag;
    }, 10, 3);
}
add_action('wp_enqueue_scripts', 'astra_performance_optimizations', 100);