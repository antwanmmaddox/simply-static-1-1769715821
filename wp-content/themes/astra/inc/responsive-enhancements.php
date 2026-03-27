<?php
/**
 * Responsive Enhancements for Teresa Edwards Website
 * 
 * This file handles the enqueuing of responsive CSS and JavaScript,
 * adds proper meta tags, and implements responsive functionality.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Enqueue responsive enhancement assets
 */
function teresa_edwards_enqueue_responsive_assets() {
    // Enqueue mobile-first CSS (highest priority)
    wp_enqueue_style(
        'teresa-mobile-first',
        get_template_directory_uri() . '/assets/css/mobile-first.css',
        array('astra-theme-css'),
        '1.0.0',
        'all'
    );
    
    // Enqueue browser compatibility CSS
    wp_enqueue_style(
        'teresa-browser-compatibility',
        get_template_directory_uri() . '/assets/css/browser-compatibility.css',
        array('teresa-mobile-first'),
        '1.0.0',
        'all'
    );
    
    // Enqueue responsive enhancements CSS
    wp_enqueue_style(
        'teresa-responsive-enhancements',
        get_template_directory_uri() . '/assets/css/responsive-enhancements.css',
        array('teresa-browser-compatibility'),
        '1.0.0',
        'all'
    );

    // Enqueue responsive JavaScript
    wp_enqueue_script(
        'teresa-responsive-enhancements',
        get_template_directory_uri() . '/assets/js/responsive-enhancements.js',
        array(),
        '1.0.0',
        true
    );

    // Add inline CSS for critical responsive fixes
    $inline_css = "
        /* Critical responsive fixes */
        @media screen and (max-width: 479px) {
            .elementor-section {
                padding: 20px 0 !important;
            }
            .elementor-container {
                padding: 0 15px !important;
            }
        }
        
        /* Viewport height fix for mobile browsers */
        .mobile-vh-fix {
            height: 100vh;
            height: calc(var(--vh, 1vh) * 100);
        }
    ";
    wp_add_inline_style('teresa-responsive-enhancements', $inline_css);

    // Add responsive JavaScript variables
    wp_localize_script('teresa-responsive-enhancements', 'teresaResponsive', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('teresa_responsive_nonce'),
        'breakpoints' => array(
            'xs' => 479,
            'sm' => 767,
            'md' => 1023,
            'lg' => 1199,
            'xl' => 1200
        ),
        'isMobile' => wp_is_mobile(),
        'isRTL' => is_rtl()
    ));
}
add_action('wp_enqueue_scripts', 'teresa_edwards_enqueue_responsive_assets');

/**
 * Add enhanced viewport meta tag
 */
function teresa_edwards_enhanced_viewport_meta() {
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes">' . "\n";
    
    // Add mobile-specific meta tags
    echo '<meta name="format-detection" content="telephone=no">' . "\n";
    echo '<meta name="mobile-web-app-capable" content="yes">' . "\n";
    echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
    echo '<meta name="apple-mobile-web-app-status-bar-style" content="default">' . "\n";
    echo '<meta name="theme-color" content="#ffffff">' . "\n";
    
    // Add IE compatibility
    echo '<meta http-equiv="X-UA-Compatible" content="IE=edge">' . "\n";
}
add_action('wp_head', 'teresa_edwards_enhanced_viewport_meta', 1);

/**
 * Add responsive body classes
 */
function teresa_edwards_responsive_body_classes($classes) {
    // Add device type classes
    if (wp_is_mobile()) {
        $classes[] = 'mobile-device';
    } else {
        $classes[] = 'desktop-device';
    }

    // Add browser detection classes
    $user_agent = $_SERVER['HTTP_USER_AGENT'];
    
    if (strpos($user_agent, 'Chrome') !== false) {
        $classes[] = 'browser-chrome';
    } elseif (strpos($user_agent, 'Firefox') !== false) {
        $classes[] = 'browser-firefox';
    } elseif (strpos($user_agent, 'Safari') !== false && strpos($user_agent, 'Chrome') === false) {
        $classes[] = 'browser-safari';
    } elseif (strpos($user_agent, 'Edge') !== false) {
        $classes[] = 'browser-edge';
    } elseif (strpos($user_agent, 'MSIE') !== false || strpos($user_agent, 'Trident') !== false) {
        $classes[] = 'browser-ie';
    }

    // Add OS detection classes
    if (strpos($user_agent, 'Windows') !== false) {
        $classes[] = 'os-windows';
    } elseif (strpos($user_agent, 'Mac') !== false) {
        $classes[] = 'os-mac';
    } elseif (strpos($user_agent, 'Linux') !== false) {
        $classes[] = 'os-linux';
    } elseif (strpos($user_agent, 'iPhone') !== false || strpos($user_agent, 'iPad') !== false) {
        $classes[] = 'os-ios';
    } elseif (strpos($user_agent, 'Android') !== false) {
        $classes[] = 'os-android';
    }

    return $classes;
}
add_filter('body_class', 'teresa_edwards_responsive_body_classes');

/**
 * Add responsive image sizes
 */
function teresa_edwards_responsive_image_sizes() {
    // Add custom image sizes for responsive design
    add_image_size('mobile-hero', 480, 320, true);
    add_image_size('tablet-hero', 768, 512, true);
    add_image_size('desktop-hero', 1200, 600, true);
    add_image_size('mobile-product', 300, 300, true);
    add_image_size('tablet-product', 400, 400, true);
    add_image_size('desktop-product', 500, 500, true);
}
add_action('after_setup_theme', 'teresa_edwards_responsive_image_sizes');

/**
 * Add responsive srcset for custom images
 */
function teresa_edwards_responsive_srcset($sources, $size_array, $image_src, $image_meta, $attachment_id) {
    // Add custom responsive image sources
    $upload_dir = wp_upload_dir();
    $base_url = $upload_dir['baseurl'];
    
    // Add mobile version
    $mobile_src = str_replace($base_url, $base_url, $image_src);
    if (file_exists(str_replace($upload_dir['baseurl'], $upload_dir['basedir'], $mobile_src))) {
        $sources[480] = array(
            'url' => $mobile_src,
            'descriptor' => 'w',
            'value' => 480
        );
    }
    
    return $sources;
}
add_filter('wp_calculate_image_srcset', 'teresa_edwards_responsive_srcset', 10, 5);

/**
 * Optimize WooCommerce for mobile
 */
function teresa_edwards_woocommerce_responsive_optimizations() {
    if (!class_exists('WooCommerce')) {
        return;
    }

    // Remove unnecessary WooCommerce scripts on mobile
    if (wp_is_mobile()) {
        add_action('wp_enqueue_scripts', function() {
            if (!is_woocommerce() && !is_cart() && !is_checkout()) {
                wp_dequeue_script('wc-cart-fragments');
                wp_dequeue_script('woocommerce');
            }
        }, 99);
    }

    // Add mobile-specific WooCommerce styles
    add_action('wp_head', function() {
        if (wp_is_mobile()) {
            echo '<style>
                @media screen and (max-width: 767px) {
                    .woocommerce .products .product {
                        width: 48% !important;
                        margin: 0 1% 2em 1% !important;
                    }
                    .woocommerce ul.products li.product .woocommerce-loop-product__title {
                        font-size: 14px !important;
                        line-height: 1.3 !important;
                    }
                    .woocommerce .products .product .price {
                        font-size: 16px !important;
                        font-weight: bold !important;
                    }
                }
            </style>';
        }
    });
}
add_action('init', 'teresa_edwards_woocommerce_responsive_optimizations');

/**
 * Add responsive navigation menu
 */
function teresa_edwards_responsive_navigation() {
    // Add mobile menu toggle functionality
    add_action('wp_footer', function() {
        ?>
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            var mobileToggle = document.querySelector('.ast-mobile-menu-trigger-minimal');
            var mobileMenu = document.querySelector('.main-header-menu');
            
            if (mobileToggle && mobileMenu) {
                // Ensure proper ARIA attributes
                mobileToggle.setAttribute('aria-controls', 'mobile-menu');
                mobileToggle.setAttribute('aria-expanded', 'false');
                mobileMenu.setAttribute('id', 'mobile-menu');
                
                // Add keyboard support
                mobileToggle.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        mobileToggle.click();
                    }
                });
            }
        });
        </script>
        <?php
    });
}
add_action('init', 'teresa_edwards_responsive_navigation');

/**
 * Add responsive Elementor optimizations
 */
function teresa_edwards_elementor_responsive_optimizations() {
    if (!defined('ELEMENTOR_VERSION')) {
        return;
    }

    // Add custom Elementor breakpoints
    add_action('elementor/init', function() {
        \Elementor\Plugin::$instance->breakpoints->add_breakpoint('mobile_extra', [
            'label' => 'Mobile Extra',
            'default_value' => 480,
            'direction' => 'max'
        ]);
    });

    // Optimize Elementor for mobile
    add_action('wp_head', function() {
        if (wp_is_mobile()) {
            echo '<style>
                .elementor-section-wrap {
                    overflow-x: hidden;
                }
                .elementor-container {
                    max-width: 100% !important;
                    padding: 0 15px !important;
                }
                .elementor-row {
                    flex-wrap: wrap !important;
                }
                .elementor-column {
                    width: 100% !important;
                    margin-bottom: 20px !important;
                }
            </style>';
        }
    });
}
add_action('init', 'teresa_edwards_elementor_responsive_optimizations');

/**
 * Add responsive contact form optimizations
 */
function teresa_edwards_contact_form_responsive() {
    // Optimize Contact Form 7 for mobile
    add_action('wp_head', function() {
        if (wp_is_mobile()) {
            echo '<style>
                .wpcf7-form input[type="text"],
                .wpcf7-form input[type="email"],
                .wpcf7-form input[type="tel"],
                .wpcf7-form textarea {
                    width: 100% !important;
                    font-size: 16px !important;
                    padding: 12px !important;
                    border: 1px solid #ddd !important;
                    border-radius: 4px !important;
                    margin-bottom: 15px !important;
                }
                .wpcf7-form input[type="submit"] {
                    width: 100% !important;
                    font-size: 16px !important;
                    padding: 15px !important;
                    min-height: 44px !important;
                }
            </style>';
        }
    });
}
add_action('init', 'teresa_edwards_contact_form_responsive');

/**
 * Add performance optimizations for mobile
 */
function teresa_edwards_mobile_performance_optimizations() {
    if (!wp_is_mobile()) {
        return;
    }

    // Defer non-critical JavaScript
    add_filter('script_loader_tag', function($tag, $handle, $src) {
        $defer_scripts = array(
            'elementor-frontend',
            'woocommerce',
            'contact-form-7'
        );

        if (in_array($handle, $defer_scripts)) {
            return str_replace('<script ', '<script defer ', $tag);
        }

        return $tag;
    }, 10, 3);

    // Optimize images for mobile
    add_filter('wp_get_attachment_image_attributes', function($attr, $attachment, $size) {
        if (wp_is_mobile()) {
            $attr['loading'] = 'lazy';
            $attr['decoding'] = 'async';
        }
        return $attr;
    }, 10, 3);
}
add_action('init', 'teresa_edwards_mobile_performance_optimizations');

/**
 * Add responsive admin bar adjustments
 */
function teresa_edwards_responsive_admin_bar() {
    if (is_admin_bar_showing() && wp_is_mobile()) {
        add_action('wp_head', function() {
            echo '<style>
                @media screen and (max-width: 782px) {
                    #wpadminbar {
                        position: fixed !important;
                        top: 0 !important;
                    }
                    html {
                        margin-top: 46px !important;
                    }
                    body {
                        padding-top: 0 !important;
                    }
                }
            </style>';
        });
    }
}
add_action('init', 'teresa_edwards_responsive_admin_bar');

/**
 * Add responsive debugging (only for development)
 */
function teresa_edwards_responsive_debug() {
    if (defined('WP_DEBUG') && WP_DEBUG && current_user_can('manage_options')) {
        add_action('wp_footer', function() {
            ?>
            <div id="responsive-debug" style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; font-size: 12px; z-index: 9999; border-radius: 4px;">
                <div>Screen: <span id="screen-size"></span></div>
                <div>Breakpoint: <span id="current-breakpoint"></span></div>
                <div>Device: <span id="device-type"><?php echo wp_is_mobile() ? 'Mobile' : 'Desktop'; ?></span></div>
            </div>
            <script>
            function updateDebugInfo() {
                var width = window.innerWidth;
                var breakpoint = 'xl';
                if (width <= 479) breakpoint = 'xs';
                else if (width <= 767) breakpoint = 'sm';
                else if (width <= 1023) breakpoint = 'md';
                else if (width <= 1199) breakpoint = 'lg';
                
                document.getElementById('screen-size').textContent = width + 'px';
                document.getElementById('current-breakpoint').textContent = breakpoint;
            }
            updateDebugInfo();
            window.addEventListener('resize', updateDebugInfo);
            </script>
            <?php
        });
    }
}
add_action('init', 'teresa_edwards_responsive_debug');