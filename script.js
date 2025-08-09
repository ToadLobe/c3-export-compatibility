class CompatibilityMatrix {
    constructor() {
        this.container = document.getElementById('compatibility-table-container');
        this.init();
    }

    async init() {
        try {
            const response = await fetch('data.json');
            this.data = await response.json();
            this.render();
            this.attachEventListeners();
        } catch (error) {
            console.error('Failed to load compatibility data:', error);
            this.container.innerHTML = '<p>Failed to load compatibility data</p>';
        }
    }

    getStatusIcon(status) {
        const icons = {
            supported: 'ti ti-check',
            partial: 'ti ti-tilde',
            unsupported: 'ti ti-x',
            unknown: 'ti ti-question-mark'
        };
        return icons[status] || 'ti ti-question-mark';
    }

    getStatusText(status) {
        const texts = {
            supported: 'Supported',
            partial: 'Partially Supported',
            unsupported: 'Unsupported',
            unknown: 'Unknown'
        };
        return texts[status] || status;
    }

    getBorderColor(status) {
        const colors = {
            supported: '#4caf50',
            partial: '#ff9800',
            unsupported: '#f44336',
            unknown: '#eeeeee'
        };
        return colors[status] || '#0066cc';
    }

    createHeader() {
        const headerCells = this.data.exporters.map(exporter => `
            <th>
                ${exporter.icon ? `<i class="${exporter.icon}"></i>` : ''}
                <span class="platform-text">${exporter.name}</span>
            </th>
        `).join('');

        return `
            <thead>
                <tr>
                    <th></th>
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
                <i class="${this.getStatusIcon(supportData.status)}"></i>
                ${asterisk}
            </td>
        `;
    }

    createCategoryRows(category) {
        const categoryHeader = `
            <tr>
                <td class="category-header" colspan="${this.data.exporters.length + 1}">
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

        const feature = this.findFeature(featureName);
        const exporter = this.data.exporters.find(exp => exp.id === exporterId);
        const supportData = feature.support[exporterId];

        if (!supportData) return;

        clickedCell.classList.add('selected');
        const detailsRow = this.createDetailsRow(feature, exporter, supportData);
        featureRow.insertAdjacentHTML('afterend', detailsRow);
    }

    findFeature(featureName) {
        for (const category of this.data.categories) {
            const feature = category.features.find(f => f.name === featureName);
            if (feature) return feature;
        }
        return null;
    }

    createDetailsRow(feature, exporter, supportData) {
        const notesContent = supportData.notes?.trim() ? `
            <p>
                <i class="ti ti-asterisk" style="margin-right: 8px;"></i>
                ${supportData.notes}
            </p>
        ` : '';

        const githubContent = supportData.github !== undefined ? `
            <p style="${!supportData.github?.trim() ? 'color: #666; font-style: italic;' : ''}">
                <i class="ti ti-brand-github" style="margin-right: 8px;"></i>
                ${supportData.github?.trim() ?
                    `<a href="${supportData.github}" target="_blank" rel="noopener noreferrer">${supportData.github}</a>` :
                    'No bug report or feature request has been filed to address this issue.'
                }
            </p>
        ` : '';

        return `
            <tr class="details-row expanded" data-exporter-id="${exporter.id}">
                <td class="details-content" colspan="${this.data.exporters.length + 1}"
                    style="--bar-color: ${this.getBorderColor(supportData.status)}">
                    <h4>
                        <i class="${this.getStatusIcon(supportData.status)}" style="margin-right: 8px;"></i>
                        ${this.getStatusText(supportData.status)} on ${exporter.name}
                    </h4>
                    ${notesContent}
                    ${githubContent}
                </td>
            </tr>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CompatibilityMatrix();
});