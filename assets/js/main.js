document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Check for saved theme preference or use light theme as default
    const storedTheme = localStorage.getItem('theme');
    
    // Apply the right theme based on stored preference only
    // Default to light theme regardless of OS preference
    if (storedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '☀️';
    } else {
        // Set light theme as default
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '🌙';
        if (!storedTheme) {
            localStorage.setItem('theme', 'light');
        }
    }
    
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        
        if (document.body.classList.contains('dark-theme')) {
            themeToggle.innerHTML = '☀️';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggle.innerHTML = '🌙';
            localStorage.setItem('theme', 'light');
        }
        
        if (typeof redrawGraph === 'function') {
            redrawGraph();
        }
    });
    
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.body.classList.add('dark-theme');
                themeToggle.innerHTML = '☀️';
            } else {
                document.body.classList.remove('dark-theme');
                themeToggle.innerHTML = '🌙';
            }
        }
    });
});