class TrainTracker {
    constructor() {
        this.apiBase = '/api';
        this.currentStation = null;
        this.searchTimeout = null;
        this.debounceDelay = 300;
        this.selectedSuggestionIndex = -1;
        this.suggestionsData = [];
        this.allTrains = { departures: [], arrivals: [] };
        this.activeFilters = {
            trainTypes: ['ICE', 'EC', 'IR', 'RE', 'RB'],
            delayStatus: ['on-time', 'delayed', 'early'],
            platformOnly: false,
            direction: ''
        };
        
        this.initializeElements();
        this.bindEvents();
        this.setupAccessibility();
        this.setDefaultTimeWindow();
        this.showEmptyState();
    }

    initializeElements() {
        // Search elements
        this.stationSearch = document.getElementById('stationSearch');
        this.timeWindow = document.getElementById('timeWindow');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchSuggestions = document.getElementById('searchSuggestions');
        
        // State elements
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.results = document.getElementById('results');
        this.emptyState = document.getElementById('emptyState');
        
        // Results elements
        this.stationName = document.getElementById('stationName');
        this.stationDetails = document.getElementById('stationDetails');
        this.departuresCount = document.getElementById('departuresCount');
        this.arrivalsCount = document.getElementById('arrivalsCount');
        this.departuresList = document.getElementById('departuresList');
        this.arrivalsList = document.getElementById('arrivalsList');
        
        // Tab elements
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        
        // Filter elements
        this.toggleFiltersBtn = document.getElementById('toggleFilters');
        this.filtersContent = document.getElementById('filtersContent');
        this.clearFiltersBtn = document.getElementById('clearFilters');
        this.applyFiltersBtn = document.getElementById('applyFilters');
        this.directionFilter = document.getElementById('directionFilter');
        
        // Template
        this.trainTemplate = document.getElementById('trainTemplate');
    }

    bindEvents() {
        // Search functionality with enhanced UX
        this.stationSearch.addEventListener('input', (e) => {
            this.handleStationSearch(e.target.value);
        });
        
        this.stationSearch.addEventListener('focus', () => {
            if (this.stationSearch.value.trim()) {
                this.handleStationSearch(this.stationSearch.value);
            }
        });

        // Keyboard navigation for suggestions
        this.stationSearch.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });
        
        // Search button and Enter key
        this.searchBtn.addEventListener('click', () => this.searchStation());
        this.stationSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.selectedSuggestionIndex >= 0 && this.suggestionsData[this.selectedSuggestionIndex]) {
                    this.selectStation(this.suggestionsData[this.selectedSuggestionIndex]);
                } else {
                    this.searchStation();
                }
            }
        });
        
        // Tab switching with smooth transitions
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Click outside suggestions to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-group')) {
                this.hideSuggestions();
            }
        });

        // Time window validation
        this.timeWindow.addEventListener('change', () => {
            this.validateTimeWindow();
        });

        // Filter events
        this.toggleFiltersBtn.addEventListener('click', () => {
            this.toggleFilters();
        });

        this.clearFiltersBtn.addEventListener('click', () => {
            this.clearAllFilters();
        });

        this.applyFiltersBtn.addEventListener('click', () => {
            this.applyFilters();
        });

        // Train type filter checkboxes
        document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateActiveFilters();
            });
        });

        // Direction filter
        this.directionFilter.addEventListener('input', (e) => {
            this.activeFilters.direction = e.target.value.toLowerCase();
            this.applyFilters();
        });
    }

    setupAccessibility() {
        // Add ARIA labels
        this.stationSearch.setAttribute('aria-label', 'Search for train stations');
        this.timeWindow.setAttribute('aria-label', 'Time window in minutes');
        this.searchBtn.setAttribute('aria-label', 'Search for train departures and arrivals');
        
        // Add focus indicators
        const focusableElements = document.querySelectorAll('button, input, .suggestion-item');
        focusableElements.forEach(el => {
            el.addEventListener('focus', () => {
                el.style.outline = '2px solid #e31e24';
                el.style.outlineOffset = '2px';
            });
            
            el.addEventListener('blur', () => {
                el.style.outline = '';
                el.style.outlineOffset = '';
            });
        });
    }

    setDefaultTimeWindow() {
        // Set default time window to 60 minutes (1 hour)
        this.timeWindow.value = '60';
    }

    validateTimeWindow() {
        const value = parseInt(this.timeWindow.value);
        if (value < 15 || value > 480) {
            this.timeWindow.setCustomValidity('Time window must be between 15 and 480 minutes');
            this.timeWindow.style.borderColor = '#e31e24';
        } else {
            this.timeWindow.setCustomValidity('');
            this.timeWindow.style.borderColor = '#e1e5e9';
        }
    }

    handleSearchKeydown(e) {
        const suggestionItems = this.searchSuggestions.querySelectorAll('.suggestion-item');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.min(this.selectedSuggestionIndex + 1, suggestionItems.length - 1);
                this.updateSuggestionSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
                this.updateSuggestionSelection();
                break;
            case 'Escape':
                this.hideSuggestions();
                this.selectedSuggestionIndex = -1;
                break;
        }
    }

    updateSuggestionSelection() {
        const suggestionItems = this.searchSuggestions.querySelectorAll('.suggestion-item');
        
        suggestionItems.forEach((item, index) => {
            if (index === this.selectedSuggestionIndex) {
                item.style.backgroundColor = '#fff5f5';
                item.style.borderLeft = '3px solid #e31e24';
            } else {
                item.style.backgroundColor = '';
                item.style.borderLeft = '';
            }
        });
    }

    async handleStationSearch(query) {
        const trimmedQuery = query.trim();
        
        if (trimmedQuery.length < 2) {
            this.hideSuggestions();
            return;
        }
        
        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            try {
                this.showLoading('Searching stations...');
                const stations = await this.searchStations(trimmedQuery);
                this.showSuggestions(stations);
            } catch (error) {
                this.showError('Failed to search stations. Please try again.');
                this.hideSuggestions();
            } finally {
                this.hideLoading();
            }
        }, this.debounceDelay);
    }

    async searchStations(query) {
        const response = await fetch(`${this.apiBase}/stations?query=${encodeURIComponent(query)}&limit=8`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data || [];
    }

    showSuggestions(stations) {
        this.suggestionsData = stations;
        this.selectedSuggestionIndex = -1;
        
        if (stations.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.searchSuggestions.innerHTML = stations.map((station, index) => `
            <div class="suggestion-item" data-station-id="${station.id}" data-index="${index}" tabindex="0">
                <div class="suggestion-name">${this.escapeHtml(station.name)}</div>
                <div class="suggestion-city">${this.escapeHtml(station.city || '')}</div>
            </div>
        `).join('');
        
        // Add click listeners and keyboard support
        this.searchSuggestions.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectStation(stations[index]);
            });
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectStation(stations[index]);
                }
            });
        });
        
        this.searchSuggestions.style.display = 'block';
    }

    hideSuggestions() {
        this.searchSuggestions.style.display = 'none';
        this.selectedSuggestionIndex = -1;
    }

    selectStation(station) {
        this.currentStation = station;
        this.stationSearch.value = station.name;
        this.hideSuggestions();
        
        // Add visual feedback
        this.stationSearch.style.borderColor = '#059669';
        setTimeout(() => {
            this.stationSearch.style.borderColor = '#e1e5e9';
        }, 2000);
        
        this.searchStation();
    }

    async searchStation() {
        if (!this.currentStation) {
            const query = this.stationSearch.value.trim();
            if (query.length < 2) {
                this.showError('Please enter a station name.');
                this.stationSearch.focus();
                return;
            }
            
            try {
                const stations = await this.searchStations(query);
                if (stations.length > 0) {
                    this.currentStation = stations[0];
                } else {
                    this.showError('Station not found. Please try a different name.');
                    return;
                }
            } catch (error) {
                this.showError('Error searching for station.');
                return;
            }
        }
        
        this.loadDeparturesArrivals();
    }

    async loadDeparturesArrivals() {
        this.showLoading('Searching for trains...');
        
        // Update search button state
        this.searchBtn.disabled = true;
        const originalText = this.searchBtn.innerHTML;
        this.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        
        try {
            const minutes = parseInt(this.timeWindow.value) || 120;
            const response = await fetch(
                `${this.apiBase}/station/${this.currentStation.id}/departures?minutes=${minutes}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Store all trains for filtering
            this.allTrains = {
                departures: data.departures || [],
                arrivals: data.arrivals || []
            };
            
            // Display results
            this.displayResults(data);
            
        } catch (error) {
            this.showError('Failed to load train information. Please try again.');
        } finally {
            this.hideLoading();
            this.searchBtn.disabled = false;
            this.searchBtn.innerHTML = originalText;
        }
    }

    displayResults(data) {
        this.hideAllStates();
        this.showResults();
        
        // Update station info with animation
        this.stationName.textContent = this.currentStation.name;
        this.stationDetails.textContent = `${data.departuresCount} departures, ${data.arrivalsCount} arrivals in the next ${data.duration} minutes`;
        
        // Apply filters and display trains
        this.filterAndDisplayTrains();
        
        // Switch to departures tab by default
        this.switchTab('departures');
        
        // Scroll to results smoothly
        this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateCountWithAnimation(element, newCount) {
        element.style.transform = 'scale(1.2)';
        element.textContent = newCount;
        setTimeout(() => {
            element.style.transform = '';
        }, 200);
    }

    displayTrains(trains, container, isArrival = false) {
        if (trains.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-train"></i>
                    <h3>No trains found</h3>
                    <p>No trains in the selected time window.</p>
                    <p class="small">Try adjusting your time range or check back later.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = trains.map(train => this.createTrainHTML(train, isArrival)).join('');
        
        // Add click handlers and animations for train items
        const trainItems = container.querySelectorAll('.train-item');
        trainItems.forEach((item, index) => {
            // Stagger animation
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 50);
            
            // Click handler for train item
            item.addEventListener('click', () => {
                item.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    item.style.transform = '';
                }, 150);
            });
        });

        // Add quick filter functionality to train type labels
        const trainTypeLabels = container.querySelectorAll('.train-line');
        trainTypeLabels.forEach(label => {
            label.style.cursor = 'pointer';
            label.title = 'Click to filter by this train type';
            
            label.addEventListener('click', (e) => {
                e.stopPropagation();
                const trainType = this.getTrainTypeFromLabel(label.textContent);
                this.quickFilterByTrainType(trainType);
            });
        });
    }

    createTrainHTML(train, isArrival = false) {
        const delayInfo = this.getDelayInfo(train);
        
        // Handle different possible date formats and properties
        let actualTime, plannedTime;
        
        // Try to get actual time from various possible properties
        if (train.when) {
            actualTime = new Date(train.when);
        } else if (train.actualTime) {
            actualTime = new Date(train.actualTime);
        } else if (train.plannedWhen) {
            actualTime = new Date(train.plannedWhen);
        } else {
            actualTime = new Date(); // fallback
        }
        
        // Try to get planned time
        if (train.plannedWhen) {
            plannedTime = new Date(train.plannedWhen);
        } else if (train.plannedTime) {
            plannedTime = new Date(train.plannedTime);
        } else {
            plannedTime = actualTime; // fallback
        }
        
        // Validate dates and handle timezone issues
        if (isNaN(actualTime.getTime())) {
            actualTime = new Date();
        }
        if (isNaN(plannedTime.getTime())) {
            plannedTime = actualTime;
        }
        
        // Get line information
        let lineName = 'Unknown';
        if (train.line) {
            if (typeof train.line === 'string') {
                lineName = train.line;
            } else if (train.line.name) {
                lineName = train.line.name;
            } else if (train.line.product) {
                lineName = train.line.product;
            }
        } else if (train.category) {
            lineName = train.category;
        }
        
        // Get direction/origin
        let direction = isArrival ? 'Unknown origin' : 'Unknown destination';
        if (train.direction) {
            direction = train.direction;
        } else if (train.destination) {
            direction = train.destination;
        }
        
        // Get platform
        let platform = null;
        if (train.platform) {
            platform = train.platform;
        } else if (train.plannedPlatform) {
            platform = train.plannedPlatform;
        }
        
        return `
            <div class="train-item" data-train-id="${train.tripId || train.id || ''}">
                <div class="train-time">
                    <div class="actual-time">${this.formatTime(actualTime)}</div>
                    ${actualTime.getTime() !== plannedTime.getTime() ? 
                        `<div class="planned-time">${this.formatTime(plannedTime)}</div>` : 
                        ''
                    }
                </div>
                <div class="train-info">
                    <div class="train-line" title="Click to filter by this train type">${this.escapeHtml(lineName)}</div>
                    <div class="train-direction">
                        <i class="fas fa-arrow-${isArrival ? 'left' : 'right'}"></i>
                        <span>${this.escapeHtml(direction)}</span>
                    </div>
                </div>
                <div class="train-details">
                    ${platform ? `
                        <div class="platform-info">
                            <i class="fas fa-sign"></i>
                            <span>Platform ${this.escapeHtml(platform)}</span>
                        </div>
                    ` : ''}
                    <div class="delay ${delayInfo.class}">
                        <i class="fas ${delayInfo.class === 'on-time' ? 'fa-check-circle' : delayInfo.class === 'delayed' ? 'fa-clock' : 'fa-arrow-up'}"></i>
                        <span>${delayInfo.text}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getDelayInfo(train) {
        const delayMinutes = this.getDelayMinutes(train);
        
        if (delayMinutes === 0) {
            return { text: 'On time', class: 'on-time', delayMinutes: 0 };
        } else if (delayMinutes > 0) {
            return { text: `+${delayMinutes} min`, class: 'delayed', delayMinutes };
        } else {
            return { text: `${delayMinutes} min`, class: 'early', delayMinutes };
        }
    }

    getDelayMinutes(train) {
        // First, try to calculate delay from actual vs planned times
        let calculatedDelay = this.calculateDelayFromTimes(train);
        if (calculatedDelay !== null) {
            return calculatedDelay;
        }
        
        // Fallback to the delay property from API
        if (train.delay === null || train.delay === undefined) {
            return 0;
        }
        
        let delayValue = train.delay;
        
        // Handle different delay formats
        if (typeof delayValue === 'string') {
            delayValue = parseInt(delayValue) || 0;
        }
        
        if (typeof delayValue === 'number') {
            // If the delay is very large (> 1000), it's likely in seconds
            if (Math.abs(delayValue) > 1000) {
                const delayInMinutes = Math.round(delayValue / 60);
                return delayInMinutes;
            }
            // Otherwise, assume it's already in minutes
            return delayValue;
        }
        
        return 0;
    }

    calculateDelayFromTimes(train) {
        let actualTime, plannedTime;
        
        // Get actual time
        if (train.when) {
            actualTime = new Date(train.when);
        } else if (train.actualTime) {
            actualTime = new Date(train.actualTime);
        } else {
            return null; // No actual time available
        }
        
        // Get planned time
        if (train.plannedWhen) {
            plannedTime = new Date(train.plannedWhen);
        } else if (train.plannedTime) {
            plannedTime = new Date(train.plannedTime);
        } else {
            return null; // No planned time available
        }
        
        // Validate dates
        if (isNaN(actualTime.getTime()) || isNaN(plannedTime.getTime())) {
            return null;
        }
        
        // Calculate delay in minutes
        const delayMs = actualTime.getTime() - plannedTime.getTime();
        const delayMinutes = Math.round(delayMs / (1000 * 60));
        
        return delayMinutes;
    }

    formatTime(date) {
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    switchTab(tabName) {
        // Update tab buttons with smooth transitions
        this.tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isActive);
            
            if (isActive) {
                btn.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 200);
            }
        });
        
        // Update tab panes with smooth transitions
        this.tabPanes.forEach(pane => {
            const isActive = pane.id === `${tabName}Pane`;
            pane.classList.toggle('active', isActive);
            
            if (isActive) {
                pane.style.opacity = '0';
                pane.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    pane.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    pane.style.opacity = '1';
                    pane.style.transform = 'translateX(0)';
                }, 50);
            }
        });
    }

    showLoading(message = 'Loading...') {
        this.loading.querySelector('p').textContent = message;
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(message) {
        this.error.querySelector('p').textContent = message;
        this.error.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        this.error.style.display = 'none';
    }

    showResults() {
        this.results.style.opacity = '0';
        this.results.style.transform = 'translateY(20px)';
        this.results.style.display = 'block';
        
        setTimeout(() => {
            this.results.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            this.results.style.opacity = '1';
            this.results.style.transform = 'translateY(0)';
        }, 100);
    }

    showEmptyState() {
        this.emptyState.style.display = 'block';
    }

    hideAllStates() {
        this.loading.style.display = 'none';
        this.error.style.display = 'none';
        this.results.style.display = 'none';
        this.emptyState.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleFilters() {
        const isVisible = this.filtersContent.style.display !== 'none';
        this.filtersContent.style.display = isVisible ? 'none' : 'block';
        this.toggleFiltersBtn.classList.toggle('active', !isVisible);
        this.toggleFiltersBtn.innerHTML = isVisible ? 
            '<i class="fas fa-chevron-down"></i> Show Filters' : 
            '<i class="fas fa-chevron-up"></i> Hide Filters';
    }

    updateActiveFilters() {
        // Update train type filters
        this.activeFilters.trainTypes = [];
        document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
            if (checkbox.checked) {
                if (['ICE', 'EC', 'IR', 'RE', 'RB'].includes(checkbox.value)) {
                    this.activeFilters.trainTypes.push(checkbox.value);
                }
            }
        });

        // Update delay status filters
        this.activeFilters.delayStatus = [];
        if (document.getElementById('filterOnTime').checked) this.activeFilters.delayStatus.push('on-time');
        if (document.getElementById('filterDelayed').checked) this.activeFilters.delayStatus.push('delayed');
        if (document.getElementById('filterEarly').checked) this.activeFilters.delayStatus.push('early');

        // Update platform filter
        this.activeFilters.platformOnly = document.getElementById('filterPlatform').checked;
    }

    clearAllFilters() {
        // Reset all checkboxes to checked
        document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
            checkbox.checked = true;
        });

        // Clear direction filter
        this.directionFilter.value = '';

        // Reset active filters
        this.activeFilters = {
            trainTypes: ['ICE', 'EC', 'IR', 'RE', 'RB'],
            delayStatus: ['on-time', 'delayed', 'early'],
            platformOnly: false,
            direction: ''
        };

        // Apply filters immediately
        this.applyFilters();
    }

    applyFilters() {
        this.updateActiveFilters();
        this.filterAndDisplayTrains();
    }

    filterAndDisplayTrains() {
        if (!this.allTrains.departures.length && !this.allTrains.arrivals.length) {
            return;
        }

        const filteredDepartures = this.filterTrains(this.allTrains.departures);
        const filteredArrivals = this.filterTrains(this.allTrains.arrivals);

        // Update counts
        this.updateCountWithAnimation(this.departuresCount, filteredDepartures.length);
        this.updateCountWithAnimation(this.arrivalsCount, filteredArrivals.length);

        // Update station details text to reflect filtered results
        this.updateStationDetailsText(filteredDepartures.length, filteredArrivals.length);

        // Display filtered trains
        this.displayTrains(filteredDepartures, this.departuresList, false);
        this.displayTrains(filteredArrivals, this.arrivalsList, true);

        // Show filter status if filters are active
        this.showFilterStatus();
        
        // Scroll to results section with smooth animation
        this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    updateStationDetailsText(departuresCount, arrivalsCount) {
        const totalFiltered = departuresCount + arrivalsCount;
        const totalOriginal = this.allTrains.departures.length + this.allTrains.arrivals.length;
        
        if (totalFiltered === totalOriginal) {
            // No filters active, show original text
            this.stationDetails.textContent = `${departuresCount} departures, ${arrivalsCount} arrivals in the next ${this.timeWindow.value} minutes`;
        } else {
            // Filters active, show filtered counts
            this.stationDetails.textContent = `${departuresCount} departures, ${arrivalsCount} arrivals (filtered from ${this.allTrains.departures.length} total departures, ${this.allTrains.arrivals.length} total arrivals)`;
        }
    }

    filterTrains(trains) {
        return trains.filter(train => {
            // Train type filter
            const trainType = this.getTrainType(train);
            if (trainType === 'Non-train' || trainType === 'Unknown') {
                return false; // Exclude non-trains and unknown types
            }
            if (!this.activeFilters.trainTypes.includes(trainType)) {
                return false;
            }

            // Delay status filter
            const delayStatus = this.getDelayStatus(train);
            if (!this.activeFilters.delayStatus.includes(delayStatus)) {
                return false;
            }

            // Platform filter
            if (this.activeFilters.platformOnly && !train.platform && !train.plannedPlatform) {
                return false;
            }

            // Direction filter
            if (this.activeFilters.direction) {
                const direction = (train.direction || train.destination || '').toLowerCase();
                if (!direction.includes(this.activeFilters.direction)) {
                    return false;
                }
            }

            return true;
        });
    }

    getTrainType(train) {
        if (!train.line) return 'Unknown';
        
        const lineName = (train.line.name || train.line.product || '').toUpperCase();
        const lineMode = (train.line.mode || '').toUpperCase();
        
        // Exclude non-train vehicles
        const excludedTypes = ['BUS', 'TRAM', 'U', 'FERRY', 'CABLE_CAR', 'TAXI'];
        if (excludedTypes.some(type => lineName.includes(type) || lineMode.includes(type))) {
            return 'Non-train';
        }
        
        // Include only actual trains
        if (lineName.includes('ICE')) return 'ICE';
        if (lineName.includes('EC')) return 'EC';
        if (lineName.includes('IR')) return 'IR';
        if (lineName.includes('RE')) return 'RE';
        if (lineName.includes('RB')) return 'RB';
        
        return 'Unknown';
    }

    getDelayStatus(train) {
        const delay = this.getDelayMinutes(train);
        
        if (delay === 0) return 'on-time';
        if (delay > 0) return 'delayed';
        return 'early';
    }

    showFilterStatus() {
        const activeFilterCount = this.getActiveFilterCount();
        
        if (activeFilterCount === 0) {
            // Remove existing filter status
            const existingStatus = document.querySelector('.filter-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            return;
        }

        // Remove existing filter status
        const existingStatus = document.querySelector('.filter-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Create new filter status
        const filterStatus = document.createElement('div');
        filterStatus.className = 'filter-status';
        filterStatus.innerHTML = `
            <i class="fas fa-filter"></i>
            <span>Active filters: <span class="active-filters">${activeFilterCount}</span></span>
        `;

        // Insert before results
        this.results.parentNode.insertBefore(filterStatus, this.results);
    }

    getActiveFilterCount() {
        let count = 0;
        
        // Count non-default train types
        if (this.activeFilters.trainTypes.length < 5) count++;
        
        // Count non-default delay status
        if (this.activeFilters.delayStatus.length < 3) count++;
        
        // Count platform filter
        if (this.activeFilters.platformOnly) count++;
        
        // Count direction filter
        if (this.activeFilters.direction) count++;
        
        return count;
    }

    getTrainTypeFromLabel(labelText) {
        const text = labelText.toUpperCase();
        
        // Exclude non-train vehicles
        const excludedTypes = ['BUS', 'TRAM', 'U', 'FERRY', 'CABLE_CAR', 'TAXI'];
        if (excludedTypes.some(type => text.includes(type))) {
            return null;
        }
        
        // Include only actual trains
        if (text.includes('ICE')) return 'ICE';
        if (text.includes('EC')) return 'EC';
        if (text.includes('IR')) return 'IR';
        if (text.includes('RE')) return 'RE';
        if (text.includes('RB')) return 'RB';
        
        return null;
    }

    quickFilterByTrainType(trainType) {
        if (!trainType) return;

        // Set only this train type as active
        this.activeFilters.trainTypes = [trainType];
        
        // Update checkboxes
        document.querySelectorAll('input[type="checkbox"][value]').forEach(checkbox => {
            if (['ICE', 'EC', 'IR', 'RE', 'RB'].includes(checkbox.value)) {
                checkbox.checked = checkbox.value === trainType;
            }
        });
        
        // Apply filters
        this.filterAndDisplayTrains();
        
        // Show quick filter notification
        this.showQuickFilterNotification(`Filtered to show only ${trainType} trains`);
        
        // Scroll to results section with smooth animation
        this.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showQuickFilterNotification(message) {
        // Remove existing notification
        const existingNotification = document.querySelector('.quick-filter-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = 'quick-filter-notification';
        notification.innerHTML = `
            <i class="fas fa-filter"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrainTracker();
});
