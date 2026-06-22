document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navbar = document.querySelector('.navbar');
    const heroContent = document.querySelector('.hero-content');
    const sections = document.querySelectorAll('section');
    const navLinksAll = document.querySelectorAll('.nav-links a');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    navLinksAll.forEach((link) => {
        link.addEventListener('click', () => {
            navLinks?.classList.remove('active');
            hamburger?.classList.remove('active');
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (event) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') {
                return;
            }

            const targetSection = document.querySelector(targetId);
            if (!targetSection || !navbar) {
                return;
            }

            event.preventDefault();
            const navbarHeight = navbar.offsetHeight;
            const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - navbarHeight + 2;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('section, .project-card, .skill-category, .experience-card').forEach((element) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(24px)';
        element.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
        revealObserver.observe(element);
    });

    const setAccentFromPointer = (x, y) => {
        const width = window.innerWidth || 1;
        const height = window.innerHeight || 1;
        const hue = 24 + (x / width) * 95;
        const secondaryHue = 210 + (y / height) * 30;
        root.style.setProperty('--accent-hue', hue.toFixed(1));
        root.style.setProperty('--pointer-x', `${x}px`);
        root.style.setProperty('--pointer-y', `${y}px`);
        root.style.setProperty('--accent-2', `hsl(${secondaryHue.toFixed(1)} 92% 63%)`);
    };

    window.addEventListener('pointermove', (event) => {
        setAccentFromPointer(event.clientX, event.clientY);
    });

    if (!prefersReducedMotion) {
        window.addEventListener('click', (event) => {
            const ripple = document.createElement('span');
            ripple.className = 'cursor-ripple';
            ripple.style.left = `${event.clientX}px`;
            ripple.style.top = `${event.clientY}px`;
            document.body.appendChild(ripple);
            window.setTimeout(() => ripple.remove(), 1200);
        });
    }

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (navbar) {
            navbar.style.boxShadow = currentScroll > 12
                ? '0 18px 35px rgba(0, 0, 0, 0.32)'
                : '0 10px 30px rgba(0, 0, 0, 0.15)';
        }

        if (heroContent) {
            heroContent.style.transform = `translateY(${currentScroll * 0.22}px)`;
            heroContent.style.opacity = `${Math.max(0.72, 1 - currentScroll / 900)}`;
        }

        let currentSection = '';
        const offset = navbar ? navbar.offsetHeight + 140 : 140;

        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (currentScroll >= sectionTop - offset && currentScroll < sectionTop + sectionHeight - offset) {
                currentSection = section.getAttribute('id') || '';
            }
        });

        navLinksAll.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`);
        });
    }, { passive: true });

});
