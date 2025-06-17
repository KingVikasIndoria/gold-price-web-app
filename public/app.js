class GoldPriceApp {
    constructor() {
        this.cities = [];
        this.currentPath = window.location.pathname;
        this.init();
    }

    async init() {
        try {
            await this.loadCities();
            this.setupRouter();
            this.handleRoute();
            
            // Handle browser back/forward
            window.addEventListener('popstate', () => {
                this.handleRoute();
            });
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.renderError('Failed to initialize the application');
        }
    }

    async loadCities() {
        try {
            const response = await fetch('/api/cities');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }
            
            this.cities = await response.json();
            console.log(`Loaded ${this.cities.length} cities`);
        } catch (error) {
            console.error('Failed to load cities:', error);
            this.cities = [];
            throw error;
        }
    }

    setupRouter() {
        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (link && !link.hasAttribute('target')) {
                e.preventDefault();
                this.navigateTo(link.getAttribute('href'));
            }
        });
    }

    navigateTo(path) {
        window.history.pushState({}, '', path);
        this.currentPath = path;
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        const app = document.getElementById('app');

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === path || 
                (path === '/' && link.getAttribute('href') === '/')) {
                link.classList.add('active');
            }
        });

        if (path === '/') {
            this.renderHomePage();
        } else if (path === '/cities') {
            this.renderCitiesPage();
        } else if (path.startsWith('/city/')) {
            const cityName = decodeURIComponent(path.split('/city/')[1]);
            this.renderCityPage(cityName);
        } else {
            this.render404();
        }
    }

    renderHomePage() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="hero">
                <div class="container">
                    <h1>Live Gold Prices</h1>
                    <p>Get real-time gold prices for cities across India. Track 22K and 24K gold rates updated live.</p>
                    
                    <div class="search-container">
                        <input type="text" class="search-input" placeholder="Search for a city..." id="citySearch">
                        <div class="search-suggestions" id="searchSuggestions" style="display: none;"></div>
                    </div>
                </div>
            </div>

            <div class="container">
                <div id="featuredPrices">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading all cities' gold prices...</p>
                        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">This may take a moment as we fetch prices for all ${this.cities.length} cities</p>
                    </div>
                </div>
            </div>
        `;

        this.setupSearch();
        this.loadFeaturedPrices();
    }

    renderCitiesPage() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>All Cities</h1>
                    <p>Choose a city to view live gold prices</p>
                </div>
                
                <div class="cities-grid">
                    ${this.cities.map(city => `
                        <a href="/city/${encodeURIComponent(city)}" class="city-link">
                            <i class="fas fa-map-marker-alt" style="color: #f6ad55;"></i>
                            ${city}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async renderCityPage(cityName) {
        const app = document.getElementById('app');
        
        if (!this.cities.includes(cityName)) {
            this.render404();
            return;
        }

        app.innerHTML = `
            <div class="container">
                <a href="/cities" class="back-btn">
                    <i class="fas fa-arrow-left"></i>
                    Back to Cities
                </a>
                
                <div class="city-detail">
                    <div class="city-header">
                        <h1 class="city-title">${cityName}</h1>
                        <p class="city-subtitle">Live Gold Prices</p>
                    </div>
                    
                    <div id="cityPriceData">
                        <div class="loading">
                            <div class="spinner"></div>
                            <p>Loading gold prices for ${cityName}...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadCityPrice(cityName);
    }

    async loadCityPrice(cityName) {
        const container = document.getElementById('cityPriceData');
        
        try {
            const response = await fetch(`/api/city/${encodeURIComponent(cityName)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }
            
            const data = await response.json();
            
            if (data.success === false) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        Failed to load gold prices for ${cityName}
                        <br><small>${data.error || 'Unknown error occurred'}</small>
                    </div>
                    <button class="refresh-btn" onclick="app.loadCityPrice('${cityName}')">
                        <i class="fas fa-sync-alt"></i>
                        Try Again
                    </button>
                `;
                return;
            }

            container.innerHTML = `
                <div class="price-details">
                    <div class="price-detail-card">
                        <div class="price-type">22K Gold</div>
                        <div class="price-amount">${data.price22k}</div>
                        <div class="price-unit">per ${data.unit}</div>
                    </div>
                    <div class="price-detail-card">
                        <div class="price-type">24K Gold</div>
                        <div class="price-amount">${data.price24k}</div>
                        <div class="price-unit">per ${data.unit}</div>
                    </div>
                </div>
                
                <button class="refresh-btn" onclick="app.refreshCityPrice('${cityName}')">
                    <i class="fas fa-sync-alt"></i>
                    Refresh Prices
                </button>
                
                <div style="text-align: center; margin-top: 2rem; color: #718096; font-size: 0.9rem;">
                    <i class="fas fa-clock"></i>
                    Last updated: ${new Date().toLocaleString()}
                </div>
            `;
        } catch (error) {
            console.error('Error loading city price:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Network error occurred while loading prices
                </div>
                <button class="refresh-btn" onclick="app.loadCityPrice('${cityName}')">
                    <i class="fas fa-sync-alt"></i>
                    Try Again
                </button>
            `;
        }
    }

    async refreshCityPrice(cityName) {
        const button = document.querySelector('.refresh-btn');
        const originalContent = button.innerHTML;
        
        button.disabled = true;
        button.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin-right: 0.5rem;"></div>Refreshing...';
        
        // Add a small delay to show the loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.loadCityPrice(cityName);
        
        button.disabled = false;
        button.innerHTML = originalContent;
    }

    setupSearch() {
        const searchInput = document.getElementById('citySearch');
        const suggestions = document.getElementById('searchSuggestions');
        
        if (!searchInput || !suggestions) return;
        
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            if (query.length === 0) {
                suggestions.style.display = 'none';
                return;
            }
            
            const matches = this.cities.filter(city => 
                city.toLowerCase().includes(query)
            ).slice(0, 8);
            
            if (matches.length > 0) {
                suggestions.innerHTML = matches.map(city => `
                    <div class="suggestion-item" data-city="${city}">
                        <i class="fas fa-map-marker-alt" style="margin-right: 0.5rem; color: #f6ad55;"></i>
                        ${city}
                    </div>
                `).join('');
                suggestions.style.display = 'block';
            } else {
                suggestions.style.display = 'none';
            }
        });
        
        suggestions.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                const city = item.dataset.city;
                this.navigateTo(`/city/${encodeURIComponent(city)}`);
                suggestions.style.display = 'none';
                searchInput.value = '';
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                suggestions.style.display = 'none';
            }
        });
        
        // Handle Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const firstSuggestion = suggestions.querySelector('.suggestion-item');
                if (firstSuggestion) {
                    const city = firstSuggestion.dataset.city;
                    this.navigateTo(`/city/${encodeURIComponent(city)}`);
                    suggestions.style.display = 'none';
                    searchInput.value = '';
                }
            }
        });
    }

    async loadFeaturedPrices() {
        const container = document.getElementById('featuredPrices');
        
        try {
            // Fetch all cities' prices (no limit)
            const response = await fetch('/api/all-prices');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }
            
            const prices = await response.json();
            
            container.innerHTML = `
                <h2 style="text-align: center; color: white; margin-bottom: 2rem; font-size: 2rem;">
                    All Cities Gold Prices
                    <span style="font-size: 1rem; opacity: 0.8; display: block; margin-top: 0.5rem;">
                        Showing ${prices.length} cities
                    </span>
                </h2>
                <div class="cards-grid">
                    ${prices.map(price => `
                        <div class="price-card" onclick="app.navigateTo('/city/${encodeURIComponent(price.city)}')">
                            <div class="city-name">
                                <i class="fas fa-map-marker-alt"></i>
                                ${price.city}
                            </div>
                            <div class="price-info">
                                <div class="price-row">
                                    <span class="price-label">22K Gold</span>
                                    <span class="price-value ${price.price22k === 'Error' || price.price22k === 'N/A' ? 'error' : ''}">${price.price22k}</span>
                                </div>
                                <div class="price-row">
                                    <span class="price-label">24K Gold</span>
                                    <span class="price-value ${price.price24k === 'Error' || price.price24k === 'N/A' ? 'error' : ''}">${price.price24k}</span>
                                </div>
                                <div class="price-row">
                                    <span class="price-label">Unit</span>
                                    <span class="price-value">${price.unit}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 3rem;">
                    <button class="refresh-btn" onclick="app.loadFeaturedPrices()">
                        <i class="fas fa-sync-alt"></i>
                        Refresh All Prices
                    </button>
                </div>
                
                <div style="text-align: center; margin-top: 2rem; color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                    <i class="fas fa-clock"></i>
                    Last updated: ${new Date().toLocaleString()}
                </div>
            `;
        } catch (error) {
            console.error('Error loading featured prices:', error);
            container.innerHTML = `
                <div class="error-message">
                    Failed to load gold prices. Please check your connection and try again.
                </div>
                <button class="refresh-btn" onclick="app.loadFeaturedPrices()">
                    <i class="fas fa-sync-alt"></i>
                    Try Again
                </button>
            `;
        }
    }

    render404() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div style="text-align: center; padding: 4rem 0; color: white;">
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">404</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">Page not found</p>
                    <a href="/" class="refresh-btn" style="text-decoration: none;">
                        <i class="fas fa-home"></i>
                        Go Home
                    </a>
                </div>
            </div>
        `;
    }

    renderError(message) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div style="text-align: center; padding: 4rem 0; color: white;">
                    <h1 style="font-size: 2rem; margin-bottom: 1rem;">Error</h1>
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">${message}</p>
                    <button class="refresh-btn" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        Reload Page
                    </button>
                </div>
            </div>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GoldPriceApp();
});

// Fallback initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.app) {
            window.app = new GoldPriceApp();
        }
    });
} else {
    window.app = new GoldPriceApp();
}