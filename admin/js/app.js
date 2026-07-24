document.addEventListener('DOMContentLoaded', () => {
    let mediaList = [];
    let editingProjectId = null;
    let editingBlogId = null;
    let editingCertId = null;
    let pendingDeleteAction = null;

    // 0. DATE FORMAT HELPER
    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    // 1. TOAST NOTIFICATIONS
    window.showToast = function (message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    // 2. UNIVERSAL DELETE CONFIRMATION MODAL
    const deleteModal = document.getElementById('delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    window.openDeleteModal = function (message, actionFn) {
        if (!deleteModal) return;
        document.getElementById('delete-modal-text').textContent = message;
        pendingDeleteAction = actionFn;
        deleteModal.classList.add('show');
    };

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal?.classList.remove('show');
            pendingDeleteAction = null;
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (pendingDeleteAction) {
                await pendingDeleteAction();
            }
            deleteModal?.classList.remove('show');
            pendingDeleteAction = null;
        });
    }

    // 3. TAB NAVIGATION
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const tabTitle = document.getElementById('tab-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            item.classList.add('active');
            const tabId = item.getAttribute('data-tab');
            const targetSection = document.getElementById(`tab-${tabId}`);

            if (targetSection) targetSection.classList.add('active');
            if (tabTitle) tabTitle.textContent = item.innerText.trim();

            if (tabId === 'projects') fetchProjects();
            if (tabId === 'blogs') fetchBlogs();
            if (tabId === 'media') fetchMedia();
            if (tabId === 'about') fetchAboutContent();
            if (tabId === 'overview') calculateStorage();
        });
    });

    // 4. STORAGE & STATS CALCULATION
    async function calculateStorage() {
        if (!window.supabaseClient) return;
        const { data } = await window.supabaseClient.storage.from('portfolio-media').list('', { limit: 1000 });
        if (data) {
            const totalBytes = data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
            const storageEl = document.getElementById('stat-storage-count');
            if (storageEl) storageEl.textContent = `${totalMB} MB / 1 GB`;
        }

        const { data: certs } = await window.supabaseClient.from('certificates').select('id');
        const certsEl = document.getElementById('stat-certs-count');
        if (certsEl) certsEl.textContent = certs ? certs.length : 0;
    }

    // 5. MEDIA DROPDOWN & INSERTION
    async function populateMediaDropdowns() {
        if (!window.supabaseClient) return;
        const { data } = await window.supabaseClient.storage.from('portfolio-media').list('', { limit: 100 });
        if (!data) return;

        mediaList = data.map(file => {
            const { data: { publicUrl } } = window.supabaseClient.storage.from('portfolio-media').getPublicUrl(file.name);
            return { name: file.name, url: publicUrl };
        });

        const projSelect = document.getElementById('proj-media-select');
        const blogSelect = document.getElementById('blog-media-select');
        const certSelect = document.getElementById('cert-media-select');

        const options = `<option value="">-- Select Image from Media Library --</option>` +
            mediaList.map(m => `<option value="${m.url}">${m.name}</option>`).join('');

        if (projSelect) projSelect.innerHTML = options;
        if (blogSelect) blogSelect.innerHTML = options;
        if (certSelect) certSelect.innerHTML = `<option value="">-- Choose from Media --</option>` + mediaList.map(m => `<option value="${m.url}">${m.name}</option>`).join('');
    }

    document.getElementById('cert-media-select')?.addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('cert-thumbnail').value = e.target.value;
        }
    });

    function insertAtCursor(textarea, text) {
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + text + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
    }

    document.getElementById('insert-proj-img-btn')?.addEventListener('click', () => {
        const url = document.getElementById('proj-media-select').value;
        const textarea = document.getElementById('proj-content');
        if (!url) return showToast('Please select an image from the dropdown', 'error');
        insertAtCursor(textarea, `\n<img src="${url}" alt="Project Image">\n`);
        showToast('Image tag inserted!');
    });

    document.getElementById('insert-blog-img-btn')?.addEventListener('click', () => {
        const url = document.getElementById('blog-media-select').value;
        const textarea = document.getElementById('blog-content');
        if (!url) return showToast('Please select an image from the dropdown', 'error');
        insertAtCursor(textarea, `\n<img src="${url}" alt="Blog Image">\n`);
        showToast('Image tag inserted!');
    });

    // 6. PREVIEW MODAL
    const previewModal = document.getElementById('preview-modal');
    const previewBody = document.getElementById('preview-modal-body');
    const closePreviewBtn = document.getElementById('close-preview-modal');

    if (closePreviewBtn) closePreviewBtn.addEventListener('click', () => previewModal?.classList.remove('show'));

    // 7. CERTIFICATES CRUD
    const certModal = document.getElementById('cert-modal');
    const openCertBtn = document.getElementById('open-cert-modal-btn');
    const closeCertBtn = document.getElementById('close-cert-modal');
    const certForm = document.getElementById('cert-form');

    if (openCertBtn) {
        openCertBtn.addEventListener('click', () => {
            editingCertId = null;
            if (certForm) certForm.reset();
            document.getElementById('cert-modal-title').textContent = 'Add Certificate';
            populateMediaDropdowns();
            certModal?.classList.add('show');
        });
    }

    if (closeCertBtn) closeCertBtn.addEventListener('click', () => certModal?.classList.remove('show'));

    async function fetchCertificatesAdmin() {
        if (!window.supabaseClient) return;
        const { data: certs, error } = await window.supabaseClient.from('certificates').select('*').order('display_order', { ascending: true });
        const container = document.getElementById('certs-admin-list');
        if (!container) return;

        if (error || !certs || certs.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No certificates added yet.</p>';
            return;
        }

        container.innerHTML = certs.map(c => `
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <h4 style="font-size: 1rem;">${c.title}</h4>
                        ${c.is_featured ? '<span class="tag" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.75rem;">Featured</span>' : ''}
                    </div>
                    <p style="font-size: 0.85rem; color: var(--accent); font-weight: 500; margin-bottom: 4px;">${c.issuing_organization} &bull; ${c.issue_date}</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Order: ${c.display_order || 1}</p>
                </div>
                <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 10px;">
                    <button class="btn btn-secondary" style="padding: 4px 10px;" onclick="openEditCert('${c.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn btn-secondary" style="padding: 4px 10px;" onclick="deleteCert('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    if (certForm) {
        certForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('cert-title').value.trim();
            const issuing_organization = document.getElementById('cert-org').value.trim();
            const issue_date = document.getElementById('cert-date').value.trim();
            const thumbnail_url = document.getElementById('cert-thumbnail').value.trim();
            const description = document.getElementById('cert-desc').value.trim();
            const skills = document.getElementById('cert-skills').value.split(',').map(s => s.trim()).filter(Boolean);
            const certificate_url = document.getElementById('cert-url').value.trim();
            const linkedin_url = document.getElementById('cert-linkedin').value.trim();
            const display_order = parseInt(document.getElementById('cert-order').value) || 1;
            const is_featured = document.getElementById('cert-featured').checked;

            const payload = {
                title,
                issuing_organization,
                issue_date,
                thumbnail_url,
                description,
                skills,
                certificate_url,
                linkedin_url,
                display_order,
                is_featured
            };

            let result;
            if (editingCertId) {
                result = await window.supabaseClient.from('certificates').update(payload).eq('id', editingCertId);
            } else {
                result = await window.supabaseClient.from('certificates').insert([payload]);
            }

            if (result.error) {
                showToast(result.error.message, 'error');
            } else {
                showToast(editingCertId ? 'Certificate updated!' : 'Certificate created!');
                certModal?.classList.remove('show');
                certForm.reset();
                editingCertId = null;
                fetchCertificatesAdmin();
                calculateStorage();
            }
        });
    }

    window.openEditCert = async function (id) {
        const { data: c, error } = await window.supabaseClient.from('certificates').select('*').eq('id', id).single();
        if (error || !c) return showToast('Error loading certificate details', 'error');

        editingCertId = id;
        document.getElementById('cert-title').value = c.title || '';
        document.getElementById('cert-org').value = c.issuing_organization || '';
        document.getElementById('cert-date').value = c.issue_date || '';
        document.getElementById('cert-thumbnail').value = c.thumbnail_url || '';
        document.getElementById('cert-desc').value = c.description || '';
        document.getElementById('cert-skills').value = (c.skills || []).join(', ');
        document.getElementById('cert-url').value = c.certificate_url || '';
        document.getElementById('cert-linkedin').value = c.linkedin_url || '';
        document.getElementById('cert-order').value = c.display_order || 1;
        document.getElementById('cert-featured').checked = c.is_featured || false;

        document.getElementById('cert-modal-title').textContent = 'Edit Certificate';
        populateMediaDropdowns();
        certModal?.classList.add('show');
    };

    window.deleteCert = function (id) {
        window.openDeleteModal("Are you sure you want to delete this certificate credential?", async () => {
            const { error } = await window.supabaseClient.from('certificates').delete().eq('id', id);
            if (error) showToast(error.message, 'error');
            else { showToast('Certificate deleted!'); fetchCertificatesAdmin(); calculateStorage(); }
        });
    };

    // 8. ABOUT CARDS & SKILLS MANAGEMENT
    async function fetchAboutContent() {
        if (!window.supabaseClient) return;
        fetchAboutCardsAdmin();
        fetchCertificatesAdmin();
        fetchSkillsAdmin();
    }

    // ABOUT CARDS CRUD
    const editAboutModal = document.getElementById('edit-about-card-modal');
    const closeEditAboutBtn = document.getElementById('close-edit-about-modal');

    if (closeEditAboutBtn) closeEditAboutBtn.addEventListener('click', () => editAboutModal?.classList.remove('show'));

    async function fetchAboutCardsAdmin() {
        const { data: cards } = await window.supabaseClient.from('about_cards').select('*').order('created_at', { ascending: true });
        const container = document.getElementById('about-cards-admin-list');
        if (!container) return;

        if (!cards || cards.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No cards added yet.</p>';
            return;
        }

        container.innerHTML = cards.map(c => `
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h4 style="margin-bottom: 6px;"><i class="${c.icon || 'fa-solid fa-briefcase'}" style="color:var(--accent); margin-right:6px;"></i> ${c.title}</h4>
                    <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5;">${c.description}</p>
                </div>
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button class="btn btn-secondary" style="padding: 4px 10px;" onclick="openEditAboutCard('${c.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn btn-secondary" style="padding: 4px 10px;" onclick="deleteAboutCard('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('add-about-card-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('about-card-title').value.trim();
        const icon = document.getElementById('about-card-icon').value;
        const description = document.getElementById('about-card-desc').value.trim();

        const { error } = await window.supabaseClient.from('about_cards').insert([{ title, icon, description }]);
        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Card added successfully!');
            document.getElementById('about-card-title').value = '';
            document.getElementById('about-card-desc').value = '';
            fetchAboutCardsAdmin();
        }
    });

    window.openEditAboutCard = async function (id) {
        const { data: c, error } = await window.supabaseClient.from('about_cards').select('*').eq('id', id).single();
        if (error || !c) return showToast('Error loading card details', 'error');

        document.getElementById('edit-about-card-id').value = c.id;
        document.getElementById('edit-about-card-title').value = c.title || '';
        document.getElementById('edit-about-card-icon').value = c.icon || 'fa-solid fa-briefcase';
        document.getElementById('edit-about-card-desc').value = c.description || '';

        editAboutModal?.classList.add('show');
    };

    document.getElementById('edit-about-card-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-about-card-id').value;
        const title = document.getElementById('edit-about-card-title').value.trim();
        const icon = document.getElementById('edit-about-card-icon').value;
        const description = document.getElementById('edit-about-card-desc').value.trim();

        const { error } = await window.supabaseClient.from('about_cards').update({ title, icon, description }).eq('id', id);

        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Card updated successfully!');
            editAboutModal?.classList.remove('show');
            fetchAboutCardsAdmin();
        }
    });

    window.deleteAboutCard = function (id) {
        window.openDeleteModal("Are you sure you want to delete this About Card?", async () => {
            const { error } = await window.supabaseClient.from('about_cards').delete().eq('id', id);
            if (error) showToast(error.message, 'error');
            else { showToast('Card deleted!'); fetchAboutCardsAdmin(); }
        });
    };

    // SKILLS CRUD
    const editSkillModal = document.getElementById('edit-skill-modal');
    const closeEditSkillBtn = document.getElementById('close-edit-skill-modal');

    if (closeEditSkillBtn) closeEditSkillBtn.addEventListener('click', () => editSkillModal?.classList.remove('show'));

    async function fetchSkillsAdmin() {
        const { data: skills } = await window.supabaseClient.from('skills').select('*').order('created_at', { ascending: true });
        const container = document.getElementById('skills-admin-list');
        if (!container) return;

        if (!skills || skills.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No skills added yet.</p>';
            return;
        }

        container.innerHTML = skills.map(s => `
            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); padding: 10px 14px; border-radius: var(--radius); display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <strong>${s.name}</strong>
                    <div style="font-size: 0.8rem; color: var(--accent); font-weight: 600;">${s.level}</div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-secondary" style="padding: 4px 8px;" onclick="openEditSkill('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-secondary" style="padding: 4px 8px;" onclick="deleteSkill('${s.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('add-skill-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('skill-name').value.trim();
        const level = document.getElementById('skill-level').value;

        const { error } = await window.supabaseClient.from('skills').insert([{ name, level }]);
        if (error) showToast(error.message, 'error');
        else {
            showToast('Skill added!');
            document.getElementById('skill-name').value = '';
            fetchSkillsAdmin();
        }
    });

    window.openEditSkill = async function (id) {
        const { data: s, error } = await window.supabaseClient.from('skills').select('*').eq('id', id).single();
        if (error || !s) return showToast('Error loading skill details', 'error');

        document.getElementById('edit-skill-id').value = s.id;
        document.getElementById('edit-skill-name').value = s.name || '';
        document.getElementById('edit-skill-level').value = s.level || 'Intermediate';

        editSkillModal?.classList.add('show');
    };

    document.getElementById('edit-skill-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-skill-id').value;
        const name = document.getElementById('edit-skill-name').value.trim();
        const level = document.getElementById('edit-skill-level').value;

        const { error } = await window.supabaseClient.from('skills').update({ name, level }).eq('id', id);

        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('Skill updated successfully!');
            editSkillModal?.classList.remove('show');
            fetchSkillsAdmin();
        }
    });

    window.deleteSkill = function (id) {
        window.openDeleteModal("Are you sure you want to delete this technical skill?", async () => {
            const { error } = await window.supabaseClient.from('skills').delete().eq('id', id);
            if (error) showToast(error.message, 'error');
            else { showToast('Skill deleted!'); fetchSkillsAdmin(); }
        });
    };

    // 9. PROJECT FORM SUBMIT
    const projectModal = document.getElementById('project-modal');
    const openProjBtn = document.getElementById('open-project-modal-btn');
    const closeProjBtn = document.getElementById('close-project-modal');
    const projectForm = document.getElementById('project-form');

    if (openProjBtn) {
        openProjBtn.addEventListener('click', () => {
            editingProjectId = null;
            if (projectForm) projectForm.reset();
            const modalTitle = projectModal.querySelector('h3');
            if (modalTitle) modalTitle.textContent = 'Add New Project';
            document.getElementById('progress-input-group').style.display = 'none';
            populateMediaDropdowns();
            projectModal?.classList.add('show');
        });
    }
    if (closeProjBtn) closeProjBtn.addEventListener('click', () => projectModal?.classList.remove('show'));

    document.getElementById('proj-is-active')?.addEventListener('change', (e) => {
        const progressGroup = document.getElementById('progress-input-group');
        if (progressGroup) progressGroup.style.display = e.target.checked ? 'flex' : 'none';
    });

    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('proj-title').value.trim();
            const tags = document.getElementById('proj-tags').value.split(',').map(t => t.trim());
            const description = document.getElementById('proj-desc').value.trim();
            const content = document.getElementById('proj-content').value.trim();
            const repoUrl = document.getElementById('proj-repo').value.trim();
            const isActive = document.getElementById('proj-is-active')?.checked || false;
            const progressVal = parseInt(document.getElementById('proj-progress')?.value) || 100;

            const payload = {
                title,
                tags,
                description,
                content: content || description,
                repo_url: repoUrl,
                is_active_build: isActive,
                progress: isActive ? progressVal : 100
            };

            let result;
            if (editingProjectId) {
                result = await window.supabaseClient.from('projects').update(payload).eq('id', editingProjectId);
            } else {
                result = await window.supabaseClient.from('projects').insert([payload]);
            }

            if (result.error) {
                showToast(result.error.message, 'error');
            } else {
                showToast(editingProjectId ? 'Project updated!' : 'Project created!');
                projectModal?.classList.remove('show');
                projectForm.reset();
                editingProjectId = null;
                fetchProjects();
            }
        });
    }

    window.editProject = async function (id) {
        const { data: p, error } = await window.supabaseClient.from('projects').select('*').eq('id', id).single();
        if (error || !p) return showToast('Error loading project details', 'error');

        editingProjectId = id;
        document.getElementById('proj-title').value = p.title || '';
        document.getElementById('proj-tags').value = (p.tags || []).join(', ');
        document.getElementById('proj-desc').value = p.description || '';
        document.getElementById('proj-content').value = p.content || '';
        document.getElementById('proj-repo').value = p.repo_url || '';

        const isActive = p.is_active_build || false;
        document.getElementById('proj-is-active').checked = isActive;
        document.getElementById('proj-progress').value = p.progress || 75;
        document.getElementById('progress-input-group').style.display = isActive ? 'flex' : 'none';

        const modalTitle = projectModal.querySelector('h3');
        if (modalTitle) modalTitle.textContent = 'Edit Project';

        populateMediaDropdowns();
        projectModal?.classList.add('show');
    };

    window.deleteProject = function (id) {
        window.openDeleteModal("Are you sure you want to delete this project?", async () => {
            const { error } = await window.supabaseClient.from('projects').delete().eq('id', id);
            if (error) showToast(error.message, 'error');
            else { showToast('Project deleted'); fetchProjects(); }
        });
    };

    // 10. BLOG FORM SUBMIT
    const blogModal = document.getElementById('blog-modal');
    const openBlogBtn = document.getElementById('open-blog-modal-btn');
    const closeBlogBtn = document.getElementById('close-blog-modal');
    const blogForm = document.getElementById('blog-form');

    if (openBlogBtn) {
        openBlogBtn.addEventListener('click', () => {
            editingBlogId = null;
            if (blogForm) blogForm.reset();
            const modalTitle = blogModal.querySelector('h3');
            if (modalTitle) modalTitle.textContent = 'Add New Blog Post';
            populateMediaDropdowns();
            blogModal?.classList.add('show');
        });
    }
    if (closeBlogBtn) closeBlogBtn.addEventListener('click', () => blogModal?.classList.remove('show'));

    if (blogForm) {
        blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('blog-title').value.trim();
            const category = document.getElementById('blog-category').value.trim();
            const excerpt = document.getElementById('blog-excerpt').value.trim();
            const content = document.getElementById('blog-content').value.trim();
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

            const payload = { title, slug, category, excerpt, content };

            let result;
            if (editingBlogId) {
                result = await window.supabaseClient.from('blogs').update(payload).eq('id', editingBlogId);
            } else {
                result = await window.supabaseClient.from('blogs').insert([payload]);
            }

            if (result.error) {
                showToast(result.error.message, 'error');
            } else {
                showToast(editingBlogId ? 'Blog updated!' : 'Blog article published!');
                blogModal?.classList.remove('show');
                blogForm.reset();
                editingBlogId = null;
                fetchBlogs();
            }
        });
    }

    window.editBlog = async function (id) {
        const { data: b, error } = await window.supabaseClient.from('blogs').select('*').eq('id', id).single();
        if (error || !b) return showToast('Error loading blog details', 'error');

        editingBlogId = id;
        document.getElementById('blog-title').value = b.title || '';
        document.getElementById('blog-category').value = b.category || '';
        document.getElementById('blog-excerpt').value = b.excerpt || '';
        document.getElementById('blog-content').value = b.content || '';

        const modalTitle = blogModal.querySelector('h3');
        if (modalTitle) modalTitle.textContent = 'Edit Blog Post';

        populateMediaDropdowns();
        blogModal?.classList.add('show');
    };

    window.deleteBlog = function (id) {
        window.openDeleteModal("Are you sure you want to delete this blog article?", async () => {
            const { error } = await window.supabaseClient.from('blogs').delete().eq('id', id);
            if (error) showToast(error.message, 'error');
            else { showToast('Blog deleted'); fetchBlogs(); }
        });
    };

    // 11. FETCH DATA TABLES
    async function fetchProjects() {
        if (!window.supabaseClient) return;
        const { data, error } = await window.supabaseClient.from('projects').select('*').order('created_at', { ascending: false });
        if (error) return showToast(error.message, 'error');

        const countEl = document.getElementById('stat-projects-count');
        if (countEl) countEl.textContent = data.length;

        const tbody = document.getElementById('projects-table-body');
        if (tbody) {
            tbody.innerHTML = data.length === 0 ? `<tr><td colspan="4" style="text-align:center;">No projects found.</td></tr>` : data.map(p => `
                <tr>
                    <td>
                        <strong>${p.title}</strong> 
                        ${p.is_active_build ? `<span style="color:var(--accent); font-size:0.75rem;">(Building: ${p.progress || 0}%)</span>` : ''}
                    </td>
                    <td>${(p.tags || []).join(', ')}</td>
                    <td>${formatDate(p.created_at)}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-secondary" onclick="editProject('${p.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="btn btn-secondary" onclick="deleteProject('${p.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    async function fetchBlogs() {
        if (!window.supabaseClient) return;
        const { data, error } = await window.supabaseClient.from('blogs').select('*').order('created_at', { ascending: false });
        if (error) return showToast(error.message, 'error');

        const countEl = document.getElementById('stat-blogs-count');
        if (countEl) countEl.textContent = data.length;

        const tbody = document.getElementById('blogs-table-body');
        if (tbody) {
            tbody.innerHTML = data.length === 0 ? `<tr><td colspan="4" style="text-align:center;">No blog posts found.</td></tr>` : data.map(b => `
                <tr>
                    <td><strong>${b.title}</strong></td>
                    <td>${b.category || 'General'}</td>
                    <td>${formatDate(b.created_at)}</td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-secondary" onclick="editBlog('${b.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="btn btn-secondary" onclick="deleteBlog('${b.id}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    // 12. MEDIA LIBRARY
    const mediaFileInput = document.getElementById('media-file-input');
    const mediaNameInput = document.getElementById('media-name-input');
    const uploadBtn = document.getElementById('upload-media-btn');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const file = mediaFileInput?.files[0];
            if (!file) return showToast('Please select an image file', 'error');

            const fileExt = file.name.split('.').pop();
            const customName = mediaNameInput?.value.trim();

            let baseName = customName
                ? customName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
                : file.name.substring(0, file.name.lastIndexOf('.')).toLowerCase().replace(/[^a-z0-9_-]/g, '_');

            const fileName = `${baseName}_${Date.now().toString().slice(-4)}.${fileExt}`;

            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';

            const { error } = await window.supabaseClient.storage.from('portfolio-media').upload(fileName, file);

            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';

            if (error) {
                showToast(error.message, 'error');
            } else {
                showToast('Image uploaded successfully!');
                if (mediaFileInput) mediaFileInput.value = '';
                if (mediaNameInput) mediaNameInput.value = '';
                fetchMedia();
                populateMediaDropdowns();
            }
        });
    }

    async function fetchMedia() {
        if (!window.supabaseClient) return;
        const { data, error } = await window.supabaseClient.storage.from('portfolio-media').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        const grid = document.getElementById('media-grid');
        if (!grid) return;

        if (error) {
            grid.innerHTML = `<p style="color: #ef4444;">Make sure 'portfolio-media' bucket exists and is set to Public in Supabase Storage.</p>`;
            return;
        }

        if (data.length === 0) {
            grid.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1/-1;">No images uploaded yet.</p>`;
            return;
        }

        grid.innerHTML = data.map(file => {
            const { data: { publicUrl } } = window.supabaseClient.storage.from('portfolio-media').getPublicUrl(file.name);

            return `
                <div class="media-card" style="position: relative;">
                    <img src="${publicUrl}" alt="${file.name}" loading="lazy" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px;">
                    <p style="font-size: 0.8rem; margin: 0.5rem 0; overflow: hidden; text-overflow: ellipsis;">${file.name}</p>
                    
                    <div class="media-actions" style="display: flex; gap: 4px;">
                        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${publicUrl}'); showToast('URL Copied!');"><i class="fa-regular fa-copy"></i></button>
                        <button class="btn btn-secondary" onclick="renameMedia('${file.name}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-secondary" onclick="convertToWebP('${publicUrl}', '${file.name}')"><i class="fa-solid fa-wand-magic-sparkles"></i> WebP</button>
                        <button class="btn btn-secondary" onclick="deleteMedia('${file.name}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.renameMedia = async function (oldName) {
        const newName = prompt("Enter new filename (including extension):", oldName);
        if (!newName || newName === oldName) return;

        const { error } = await window.supabaseClient.storage.from('portfolio-media').move(oldName, newName);
        if (error) showToast(error.message, 'error');
        else { showToast('File renamed!'); fetchMedia(); }
    };

    window.convertToWebP = async function (imgUrl, originalName) {
        showToast('Converting image to WebP...');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(async (blob) => {
                const webpName = originalName.substring(0, originalName.lastIndexOf('.')) + '.webp';
                const { error } = await window.supabaseClient.storage.from('portfolio-media').upload(webpName, blob, { contentType: 'image/webp' });

                if (error) showToast(error.message, 'error');
                else { showToast('Converted & Saved as WebP!'); fetchMedia(); }
            }, 'image/webp', 0.8);
        };
    };

    window.deleteMedia = function (fileName) {
        window.openDeleteModal("Are you sure you want to delete this image from storage?", async () => {
            const { error } = await window.supabaseClient.storage.from('portfolio-media').remove([fileName]);
            if (error) showToast(error.message, 'error');
            else { showToast('Image deleted'); fetchMedia(); populateMediaDropdowns(); }
        });
    };

    // 13. RESTORE BACKUP
    document.getElementById('import-json-btn')?.addEventListener('click', () => {
        const file = document.getElementById('import-json-file')?.files[0];
        if (!file) return showToast('Please select a JSON backup file', 'error');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (backup.projects?.length) {
                    await window.supabaseClient.from('projects').upsert(backup.projects);
                }
                if (backup.blogs?.length) {
                    await window.supabaseClient.from('blogs').upsert(backup.blogs);
                }
                if (backup.certificates?.length) {
                    await window.supabaseClient.from('certificates').upsert(backup.certificates);
                }
                showToast('Database successfully restored!');
                fetchProjects();
                fetchBlogs();
                fetchCertificatesAdmin();
            } catch (err) {
                showToast('Invalid backup file format', 'error');
            }
        };
        reader.readAsText(file);
    });

    // INITIAL LOAD
    fetchProjects();
    fetchBlogs();
    populateMediaDropdowns();
    calculateStorage();
});