// Modern website animations and interactions
document.addEventListener('DOMContentLoaded', function() {

    // Initialize Materialize components
    M.AutoInit();

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('.animated-text, .glass-card, .profile-image').forEach(el => {
        observer.observe(el);
    });

    // Add loading animation
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
    });

    // Parallax effect for background elements
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax img');

        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });

    // Enhanced social icon interactions
    const socialIcons = document.querySelectorAll('.social-icon');
    socialIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.2) rotate(5deg)';
        });

        icon.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1) rotate(0deg)';
        });
    });

    // Add typing effect to main title
    const title = document.querySelector('#logo-container');
    if (title) {
        const originalText = title.textContent;
        title.textContent = '';
        let i = 0;

        function typeWriter() {
            if (i < originalText.length) {
                title.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        }

        setTimeout(typeWriter, 1000);
    }

    // Mouse trail effect
    let mouseTrails = [];
    document.addEventListener('mousemove', function(e) {
        if (mouseTrails.length < 10) {
            const trail = document.createElement('div');
            trail.className = 'mouse-trail';
            trail.style.left = e.clientX - 10 + 'px';
            trail.style.top = e.clientY - 10 + 'px';
            document.body.appendChild(trail);
            mouseTrails.push(trail);

            setTimeout(() => {
                trail.remove();
                mouseTrails = mouseTrails.filter(t => t !== trail);
            }, 1000);
        }
    });

    // Add dynamic color changing based on time - Dark Theme
    function updateTimeBasedColors() {
        const hour = new Date().getHours();
        const root = document.documentElement;

        if (hour >= 6 && hour < 12) {
            // Morning - dark warm colors
            root.style.setProperty('--primary-gradient', 'linear-gradient(45deg, #2c1810, #4a2c2a)');
        } else if (hour >= 12 && hour < 18) {
            // Afternoon - dark bright colors
            root.style.setProperty('--primary-gradient', 'linear-gradient(45deg, #1a1a2e, #16213e)');
        } else if (hour >= 18 && hour < 24) {
            // Evening - dark cool colors
            root.style.setProperty('--primary-gradient', 'linear-gradient(45deg, #0f3460, #533483)');
        } else {
            // Night - very dark colors
            root.style.setProperty('--primary-gradient', 'linear-gradient(45deg, #0a0a0a, #1a1a2e)');
        }
    }    updateTimeBasedColors();
    setInterval(updateTimeBasedColors, 60000); // Update every minute

    // Add click ripple effects - Dark Theme
    document.addEventListener('click', function(e) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(83, 52, 131, 0.4);
            transform: scale(0);
            animation: rippleEffect 0.6s linear;
            pointer-events: none;
            z-index: 1000;
        `;

        const size = 100;
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - size / 2) + 'px';
        ripple.style.top = (e.clientY - size / 2) + 'px';

        document.body.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });

    // Add particle effect on scroll - Dark Theme
    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #1a1a2e, #533483);
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            opacity: 0;
            animation: particleFloat 3s ease-out forwards;
        `;

        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.top = window.innerHeight + 'px';

        document.body.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 3000);
    }

    // Create particles on scroll
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (Math.random() > 0.7) {
                createParticle();
            }
        }, 100);
    });

    // Add keyboard shortcuts for fun effects
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            // Trigger confetti effect
            for (let i = 0; i < 50; i++) {
                setTimeout(() => createParticle(), i * 20);
            }
        }

        if (e.key === ' ' && e.ctrlKey) {
            // Toggle dark mode
            document.body.classList.toggle('dark-mode');
        }
    });
});

// Add CSS keyframes for new animations
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes particleFloat {
        0% {
            opacity: 0;
            transform: translateY(0) scale(0);
        }
        10% {
            opacity: 1;
            transform: translateY(-20px) scale(1);
        }
        90% {
            opacity: 1;
            transform: translateY(-200px) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(-220px) scale(0);
        }
    }

    @keyframes rippleEffect {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    .animate-in {
        animation: fadeInUp 0.8s ease-out forwards;
    }

    body:not(.loaded) * {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
    }

    .loaded {
        animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .dark-mode {
        filter: invert(1) hue-rotate(180deg);
    }

    .dark-mode img,
    .dark-mode video,
    .dark-mode iframe {
        filter: invert(1) hue-rotate(180deg);
    }

    /* Pulse effect for interactive elements */
    .pulse-on-hover:hover {
        animation: pulse 1s infinite;
    }

    /* Shake effect */
    .shake {
        animation: shake 0.5s;
    }

    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(additionalStyles);
