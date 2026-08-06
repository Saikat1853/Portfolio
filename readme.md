# Personal Portfolio & Dynamic Admin Dashboard

A full-stack static portfolio website integrated with a real-time, lightweight admin panel powered by **Supabase**. Built for showcasing web/hardware projects, dynamic progress bars, blog articles, technical skills, and media assets.

---

## 🚀 Features

### 🌐 Public Portfolio
* **Interactive Hero Section**: Dynamic typewriter banner displaying core specialties.
* **Live Project Progress**: Dedicated showcase card for active hardware/software builds with animated completion percentages.
* **Featured Projects Grid**: Responsive 2x2 grid view for completed builds with tag filtering and full write-up modals.
* **Dynamic About Page**: Modular background cards (Bio, Experience, Internships, Goals) and technical proficiency chips rendered live from Supabase.
* **Blog Engine**: Dynamic post list with category tags and markdown write-up support.
* **Light / Dark Mode**: Theme toggle with persistent `localStorage` preference.

### ⚡ Admin Dashboard (`/admin/`)
* **Secure Session Auth**: Protected dashboard route backed by Supabase Authentication.
* **About Cards Manager**: Full CRUD control to add, edit, or delete custom sections with font-awesome icons.
* **Skill Level Manager**: Dynamic controls for technical skills with proficiency level dropdowns (`Beginner`, `Intermediate`, `Advanced`, `Expert`).
* **Active Progress Controller**: Adjust progress percentages or mark builds as active in real-time.
* **Media Library & Conversion**: Upload directly to Supabase Storage, copy image URLs, rename files, or auto-convert images to `.webp`.
* **Database Backup / Restore**: Export entire project and blog schema to JSON for local data redundancy.
* **Custom UI Modals**: Native browser popups replaced with custom-designed delete and edit dialogs.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+), FontAwesome v6
* **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
* **Storage**: Supabase Bucket (`portfolio-media`)
* **Parsers**: `marked.js` for Markdown-to-HTML rendering
* **Hosting**: GitHub Pages

---

## 📂 Project Structure

```text
my-portfolio/
├── index.html              # Homepage & Hero typewriter
├── about.html              # Dynamic Bio, Cards & Skills
├── projects.html           # Active Progress & Completed Projects Grid
├── blog.html               # Blog listing page
├── contact.html            # Contact form page
├── css/
│   ├── style.css           # Global layout & theme variables
│   └── responsive.css      # Mobile & tablet breakpoints
├── js/
│   └── main.js             # Public site logic & Supabase fetchers
├── assets/                 # Resume PDF & static icons
└── admin/
    ├── index.html          # Admin Login Portal
    ├── dashboard.html      # Central Control Panel
    ├── css/
    │   └── admin.css       # Admin dashboard styles
    └── js/
        ├── app.js          # Admin CRUD logic & Modal controls
        ├── auth.js         # Authentication session guard
        └── supabase.js     # Supabase client initialization
