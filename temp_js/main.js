document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. GLOBAL NAVIGATION & THEME TOGGLE
    // ==========================================

    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        const hamburgerIcon = hamburger.querySelector('i');

        function toggleMenu() {
            navMenu.classList.toggle('active');
            if (navMenu.classList.contains('active')) {
                hamburgerIcon.classList.remove('fa-bars');
                hamburgerIcon.classList.add('fa-xmark');
            } else {
                hamburgerIcon.classList.remove('fa-xmark');
                hamburgerIcon.classList.add('fa-bars');
            }
        }

        hamburger.addEventListener('click', toggleMenu);

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu.classList.contains('active')) toggleMenu();
            });
        });
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        }

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if (themeIcon) themeIcon.className = 'fa-regular fa-moon';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
            }
        });
    }

    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();


    // ==========================================
    // 2. PROJECTS PAGE & DYNAMIC MODAL LOGIC
    // ==========================================

    const projectsGrid = document.querySelector('.projects-grid');

    if (projectsGrid) {
        loadProjects(projectsGrid);
    }
});

async function loadProjects(projectsGrid) {
    projectsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Loading projects...</p>';

    try {
        if (!window.supabaseClient) return;

        // Fetch All Projects
        const { data: projects, error } = await window.supabaseClient
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter Ongoing vs Completed Projects
        const activeProjects = (projects || []).filter(p => p.is_active_build === true);
        const completedProjects = (projects || []).filter(p => !p.is_active_build);

        // 1. RENDER MULTIPLE ONGOING PROJECTS
        const activeContainer = document.getElementById('active-projects-container');
        if (activeContainer) {
            if (activeProjects.length > 0) {
                activeContainer.innerHTML = activeProjects.map(proj => `
                    <div class="active-project-card project-card" data-project-id="${proj.id}" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 1.5rem; cursor: pointer;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                            <span class="tag" style="background: rgba(14, 165, 233, 0.15); color: var(--accent);"><i class="fa-solid fa-spinner fa-spin"></i> Currently Building</span>
                            <span style="font-weight: 600;">${proj.progress || 0}% Completed</span>
                        </div>
                        <h3>${proj.title}</h3>
                        <p style="color: var(--text-secondary); margin: 0.5rem 0 1rem 0;">${proj.description || ''}</p>
                        <div class="progress-bar-container" style="background: var(--border-color); height: 10px; border-radius: 5px; overflow: hidden;">
                            <div style="width: ${proj.progress || 0}%; height: 100%; background: var(--accent); transition: width 0.5s ease;"></div>
                        </div>
                    </div>
                `).join('');
                activeContainer.style.display = 'block';
            } else {
                activeContainer.innerHTML = '';
                activeContainer.style.display = 'none';
            }
        }

        // 2. RENDER COMPLETED PROJECTS GRID
        if (!completedProjects || completedProjects.length === 0) {
            projectsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No completed projects added yet.</p>';
        } else {
            projectsGrid.innerHTML = completedProjects.map(project => `
                <article class="project-card" data-project-id="${project.id}">
                    <div>
                        <h3>${project.title}</h3>
                        <p>${project.description || ''}</p>
                        <div class="tag-list">
                            ${(project.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="project-links">
                        ${project.repo_url ? `<a href="${project.repo_url}" target="_blank" onclick="event.stopPropagation();"><i class="fab fa-github"></i> Repository</a>` : ''}
                        <span class="read-more-btn">View Details <i class="fa-solid fa-arrow-right"></i></span>
                    </div>
                </article>
            `).join('');
        }

        // 3. ATTACH MODAL LISTENERS TO ALL CARDS (ONGOING & COMPLETED)
        const modal = document.getElementById('project-modal');
        const modalBody = document.getElementById('modal-body');
        const closeModalBtn = document.getElementById('close-modal');

        document.querySelectorAll('.project-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-project-id');
                const selectedProject = projects.find(p => String(p.id) === String(id));

                if (selectedProject && modal && modalBody) {
                    const rawContent = selectedProject.content || selectedProject.description || 'No detailed writeup available.';
                    const renderedContent = typeof marked !== 'undefined' ? marked.parse(rawContent) : rawContent;

                    modalBody.innerHTML = `
                        <article class="modal-article">
                            <h2>${selectedProject.title}</h2>
                            <div class="tag-list modal-meta" style="margin-bottom: 1.5rem;">
                                ${(selectedProject.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
                            </div>
                            <div class="article-content" style="line-height: 1.7; color: var(--text-secondary);">
                                ${renderedContent}
                            </div>
                            ${selectedProject.repo_url ? `
                                <div style="margin-top: 1.5rem;">
                                    <a href="${selectedProject.repo_url}" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
                                        <i class="fab fa-github"></i> View Repository
                                    </a>
                                </div>
                            ` : ''}
                        </article>
                    `;

                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        // Close Modal Handlers
        function closeModal() {
            if (modal) {
                modal.classList.remove('show');
                document.body.style.overflow = 'auto';
            }
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

    } catch (err) {
        console.error('Error fetching projects:', err);
        projectsGrid.innerHTML = '<p style="text-align: center; color: #ef4444; grid-column: 1/-1;">Failed to load projects.</p>';
    }
}

// ==========================================
// 3. TYPING EFFECT FOR HERO SECTION
// ==========================================

const phrases = [
    "Electronics & Instrumentation Engineering Student",
    "Data Analyst",
    "Embedded Systems Enthusiast"
];

let phraseIdx = 0;
let charIdx = 0;
let isDeleting = false;
const target = document.getElementById('typewriter');

function typeEffect() {
    if (!target) return;
    const current = phrases[phraseIdx];
    
    if (isDeleting) {
        target.textContent = current.substring(0, charIdx - 1);
        charIdx--;
    } else {
        target.textContent = current.substring(0, charIdx + 1);
        charIdx++;
    }

    let speed = isDeleting ? 40 : 80;

    if (!isDeleting && charIdx === current.length) {
        speed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        speed = 500;
    }

    setTimeout(typeEffect, speed);
}

document.addEventListener('DOMContentLoaded', typeEffect);