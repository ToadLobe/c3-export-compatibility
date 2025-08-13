class CompatibilityMatrix {
    constructor() {
        this.container = document.getElementById('compatibility-table-container');
        this.currentFilter = null;
        this.statusConfig = {
            supported: { icon: 'ti ti-check', text: 'Supported', color: '#4caf50' },
            partial: { icon: 'ti ti-tilde', text: 'Partially Supported', color: '#ff9800' },
            unsupported: { icon: 'ti ti-x', text: 'Unsupported', color: '#f44336' },
            unknown: { icon: 'ti ti-question-mark', text: 'Unknown', color: '#eeeeee' }
        };
        this.init();
    }

    async init() {
        try {
            const response = await fetch('data.json');
            this.data = await response.json();
            this.render();
            this.attachEventListeners();
            this.setupFilters();
        } catch (error) {
            console.error('Failed to load compatibility data:', error);
            this.container.innerHTML = '<p>Failed to load compatibility data</p>';
        }
    }

    getStatus(status, property) {
        return this.statusConfig[status]?.[property] || this.statusConfig.unknown[property];
    }

    calculatePlatformScore(exporterId) {
        let supported = 0;
        let total = 0;

        this.data.categories.forEach(category => {
            category.features.forEach(feature => {
                const supportData = feature.support[exporterId];
                if (supportData && supportData.status !== 'unknown') {
                    total++;
                    if (supportData.status === 'supported') {
                        supported++;
                    }
                }
            });
        });

        return { supported, total };
    }

    createHeader() {
        const headerCells = this.data.exporters.map(exporter => {
            const score = this.calculatePlatformScore(exporter.id);
            return `
                <th>
                    ${exporter.icon ? `<i class="${exporter.icon}"></i>` : ''}
                    <span class="platform-text">${exporter.name}</span>
                    <div class="platform-score">${score.supported}/${score.total} capabilities</div>
                </th>
            `;
        }).join('');

        return `
            <thead>
                <tr>
                    <th class="filter-cell">
                        <div class="filter-group">
                            <select id="filter-type">
                                <option value="">No filter</option>
                                <option value="unique">Features unique to platform</option>
                                <option value="better">Platform A better than Platform B</option>
                            </select>
                        </div>
                        <div class="filter-options" id="filter-options"></div>
                    </th>
                    ${headerCells}
                </tr>
            </thead>
        `;
    }

    createSupportCell(feature, exporter) {
        const supportData = feature.support[exporter.id];
        if (!supportData) return '<td class="support-cell"></td>';

        const hasNotes = supportData.notes && supportData.notes.trim();
        const asterisk = hasNotes ? '<i class="ti ti-asterisk" style="margin-left: 4px; font-size: 0.8em;"></i>' : '';

        return `
            <td class="support-cell status-${supportData.status}"
                data-feature="${feature.name}"
                data-exporter="${exporter.id}"
                style="cursor: pointer">
                <i class="${this.getStatus(supportData.status, 'icon')}"></i>
                ${asterisk}
            </td>
        `;
    }

    createCategoryRows(category) {
        let colspan = this.data.exporters.length + 1;
        if (this.currentFilter?.type === 'better') {
            colspan = 3; // Feature name + 2 comparison columns
        }

        const categoryHeader = `
            <tr>
                <td class="category-header" colspan="${colspan}">
                    ${category.name}
                </td>
            </tr>
        `;

        const featureRows = category.features.map((feature, index) => {
            const supportCells = this.data.exporters.map(exporter =>
                this.createSupportCell(feature, exporter)
            ).join('');

            return `
                <tr data-category="${category.name}" data-feature-index="${index}">
                    <td>${feature.name}</td>
                    ${supportCells}
                </tr>
            `;
        }).join('');

        return categoryHeader + featureRows;
    }

    render() {
        const header = this.createHeader();
        const categoryRows = this.data.categories.map(category =>
            this.createCategoryRows(category)
        ).join('');

        this.container.innerHTML = `
            <table class="compat-table">
                ${header}
                <tbody>
                    ${categoryRows}
                </tbody>
            </table>
        `;
    }

    attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            const cell = e.target.closest('.support-cell[data-feature][data-exporter]');
            if (!cell) return;

            e.stopPropagation();
            this.toggleCellDetails(cell);
        });
    }

    toggleCellDetails(clickedCell) {
        const featureName = clickedCell.dataset.feature;
        const exporterId = clickedCell.dataset.exporter;
        const featureRow = clickedCell.closest('tr');
        const existingDetails = featureRow.nextElementSibling;

        if (existingDetails?.classList.contains('details-row') &&
            existingDetails.dataset.exporterId === exporterId) {
            existingDetails.remove();
            clickedCell.classList.remove('selected');
            return;
        }

        document.querySelectorAll('.details-row').forEach(row => row.remove());
        document.querySelectorAll('.support-cell.selected').forEach(cell =>
            cell.classList.remove('selected'));

        const feature = this.data.categories.flatMap(c => c.features).find(f => f.name === featureName);
        const exporter = this.data.exporters.find(exp => exp.id === exporterId);
        const supportData = feature?.support[exporterId];

        if (!supportData) return;

        clickedCell.classList.add('selected');
        featureRow.insertAdjacentHTML('afterend', this.createDetailsRow(exporter, supportData));
    }

    createDetailsRow(exporter, supportData) {
        const notes = supportData.notes?.trim();
        const github = supportData.github?.trim();

        // Calculate colspan based on current filter
        let colspan = this.data.exporters.length + 1;
        if (this.currentFilter?.type === 'better') {
            colspan = 3; // Feature name + 2 comparison columns
        }

        return `
            <tr class="details-row expanded" data-exporter-id="${exporter.id}">
                <td class="details-content" colspan="${colspan}"
                    style="--bar-color: ${this.getStatus(supportData.status, 'color')}">
                    <h4>
                        <i class="${this.getStatus(supportData.status, 'icon')}" style="margin-right: 8px;"></i>
                        ${this.getStatus(supportData.status, 'text')} on ${exporter.name}
                    </h4>
                    ${notes ? `<p><i class="ti ti-asterisk" style="margin-right: 8px;"></i>${notes}</p>` : ''}
                    ${supportData.github !== undefined ? `
                        <p style="${!github ? 'color: #666; font-style: italic;' : ''}">
                            <i class="ti ti-brand-github" style="margin-right: 8px;"></i>
                            ${github ? `<a href="${github}" target="_blank" rel="noopener noreferrer">${github}</a>` :
                                'No bug report or feature request has been filed to address this issue.'}
                        </p>` : ''}
                </td>
            </tr>
        `;
    }

    setupFilters() {
        const filterType = document.getElementById('filter-type');
        filterType.addEventListener('change', () => this.setupFilterOptions(filterType.value));
    }

    createPlatformSelect(placeholder = 'Select platform') {
        const options = this.data.exporters.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
        return `<option value="">${placeholder}</option>${options}`;
    }

    setupFilterOptions(filterType) {
        const filterOptions = document.getElementById('filter-options');

        if (!filterType) {
            filterOptions.innerHTML = '';
            this.applyFilter(null);
            return;
        }

        if (filterType === 'unique') {
            filterOptions.innerHTML = `<select id="unique-select">${this.createPlatformSelect()}</select>`;
            document.getElementById('unique-select').addEventListener('change', (e) => {
                this.applyFilter(e.target.value ? { type: 'unique', platform: e.target.value } : null);
            });
        }

        if (filterType === 'better') {
            filterOptions.innerHTML = `
                <select id="platform-a">${this.createPlatformSelect('Platform A')}</select>
                <span style="margin: 0 0.5rem">better than</span>
                <select id="platform-b">${this.createPlatformSelect('Platform B')}</select>
            `;

            const applyComparison = () => {
                const a = document.getElementById('platform-a').value;
                const b = document.getElementById('platform-b').value;
                this.applyFilter(a && b && a !== b ? { type: 'better', platformA: a, platformB: b } : null);
            };

            document.getElementById('platform-a').addEventListener('change', applyComparison);
            document.getElementById('platform-b').addEventListener('change', applyComparison);
        }
    }

    applyFilter(filter) {
        const previousFilterType = this.currentFilter?.type;
        this.currentFilter = filter;

        // Re-render if switching to/from better comparison (for proper colspan)
        if ((previousFilterType === 'better') !== (filter?.type === 'better')) {
            this.render();
            // After rerender, we need to restore the filter options and reapply the filter
            this.setupFilters();
            this.restoreFilterState(filter);
            this.applyFilterLogic(filter);
            return;
        }

        this.applyFilterLogic(filter);
    }

    restoreFilterState(filter) {
        if (!filter) return;

        // Restore filter type dropdown
        const filterType = document.getElementById('filter-type');
        if (filterType) {
            filterType.value = filter.type;
        }

        // Setup filter options based on the filter type
        this.setupFilterOptions(filter.type);

        // Restore specific filter values
        if (filter.type === 'unique' && filter.platform) {
            const uniqueSelect = document.getElementById('unique-select');
            if (uniqueSelect) {
                uniqueSelect.value = filter.platform;
            }
        } else if (filter.type === 'better' && filter.platformA && filter.platformB) {
            const platformA = document.getElementById('platform-a');
            const platformB = document.getElementById('platform-b');
            if (platformA && platformB) {
                platformA.value = filter.platformA;
                platformB.value = filter.platformB;
            }
        }
    }

    applyFilterLogic(filter) {
        const table = this.container.querySelector('.compat-table');

        // Handle column visibility for better than comparison
        if (filter?.type === 'better') {
            const platformAIndex = this.data.exporters.findIndex(e => e.id === filter.platformA);
            const platformBIndex = this.data.exporters.findIndex(e => e.id === filter.platformB);

            // Hide all columns except the two being compared
            table.querySelectorAll('th, td').forEach((cell) => {
                const colIndex = cell.cellIndex;
                if (colIndex === 0) return; // Keep feature name column

                const exporterIndex = colIndex - 1;
                if (exporterIndex !== platformAIndex && exporterIndex !== platformBIndex) {
                    cell.style.display = 'none';
                } else {
                    cell.style.display = '';
                }
            });
        } else {
            // Show all columns for other filters
            table.querySelectorAll('th, td').forEach(cell => {
                cell.style.display = '';
            });
        }

        // Handle row filtering
        const rows = this.container.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.classList.remove('filtered-out');

            if (row.classList.contains('details-row') || row.classList.contains('category-header')) {
                return;
            }

            if (!filter) {
                return;
            }

            const categoryName = row.dataset.category;
            const featureIndex = parseInt(row.dataset.featureIndex);

            if (categoryName && featureIndex >= 0) {
                const category = this.data.categories.find(cat => cat.name === categoryName);
                if (category && category.features[featureIndex]) {
                    const feature = category.features[featureIndex];

                    if (!this.featureMatchesFilter(feature, filter)) {
                        row.classList.add('filtered-out');
                    }
                }
            }
        });
    }

    featureMatchesFilter(feature, filter) {
        if (!filter) return true;

        const { support } = feature;
        const statusRank = { supported: 3, partial: 2, unsupported: 1, unknown: 0 };

        if (filter.type === 'unique') {
            const target = support[filter.platform];
            if (!target || target.status !== 'supported') return false;

            return this.data.exporters.every(e =>
                e.id === filter.platform || !support[e.id] || support[e.id].status !== 'supported'
            );
        }

        if (filter.type === 'better') {
            const supportA = support[filter.platformA];
            const supportB = support[filter.platformB];
            if (!supportA || !supportB) return false;

            return statusRank[supportA.status] > statusRank[supportB.status];
        }

        return true;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CompatibilityMatrix();
});