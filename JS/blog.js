document.addEventListener('DOMContentLoaded', async () => {
    const blogGrid = document.getElementById('blog-grid');
    const modal = document.getElementById('blog-modal');
    const modalBody = document.getElementById('blog-modal-body');
    const closeModalBtn = document.getElementById('close-blog-modal');
    const searchInput = document.getElementById('blog-search');

    let loadedArticles = [];

    // Helper: Format Date to DD/MM/YYYY
    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // 1. FETCH BLOGS FROM SUPABASE
    async function loadBlogs() {
        if (!blogGrid) return;

        blogGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Loading blogs...</p>';

        try {
            const { data: blogs, error } = await window.supabaseClient
                .from('blogs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            loadedArticles = blogs || [];

            renderBlogs(loadedArticles);

        } catch (err) {
            console.error('Error fetching blogs:', err);
            blogGrid.innerHTML = '<p style="text-align: center; color: #ef4444; grid-column: 1/-1;">Failed to load blogs.</p>';
        }
    }

    // 2. RENDER BLOG CARDS
    function renderBlogs(articles) {
        if (!articles || articles.length === 0) {
            blogGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No blogs published yet.</p>';
            return;
        }

        blogGrid.innerHTML = articles.map(article => `
            <article class="blog-card" data-id="${article.id}">
                <div class="blog-card-content">
                    <div class="blog-meta">
                        <span class="blog-date"><i class="fa-regular fa-calendar"></i> ${formatDate(article.created_at)}</span>
                        <span class="tag">${article.category || 'General'}</span>
                    </div>
                    <h3>${article.title}</h3>
                    <p>${article.excerpt || ''}</p>
                </div>
                <div class="blog-card-footer">
                    <span class="read-more-btn">Read Article <i class="fa-solid fa-arrow-right"></i></span>
                </div>
            </article>
        `).join('');

        // Attach Click Listeners for Modals
        document.querySelectorAll('.blog-card').forEach(card => {
            card.addEventListener('click', () => {
                const articleId = card.getAttribute('data-id');
                const article = loadedArticles.find(a => a.id === articleId);

                if (article) {
                    modalBody.innerHTML = `
                        <article class="modal-article">
                            <h2>${article.title}</h2>
                            <div class="blog-meta" style="margin-bottom: 1.5rem;">
                                <span><i class="fa-regular fa-calendar"></i> ${formatDate(article.created_at)}</span>
                                <span class="tag">${article.category || 'General'}</span>
                            </div>
                            <div class="article-content">
                                ${article.content}
                            </div>
                        </article>
                    `;

                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                }
            });
        });
    }

    // 3. LIVE SEARCH FILTER
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = loadedArticles.filter(article => 
                article.title.toLowerCase().includes(query) || 
                (article.excerpt && article.excerpt.toLowerCase().includes(query)) ||
                (article.category && article.category.toLowerCase().includes(query))
            );
            renderBlogs(filtered);
        });
    }

    // 4. MODAL CLOSE LOGIC
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

    // Initial Load
    loadBlogs();
});