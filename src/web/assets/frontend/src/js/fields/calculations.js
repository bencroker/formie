import { eventKey } from '../utils/utils';

import ExpressionLanguage from 'expression-language';

export class FormieCalculations {
    constructor(settings = {}) {
        this.$form = settings.$form;
        this.form = this.$form.form;
        this.$field = settings.$field;
        this.$input = this.$field.querySelector('input');
        this.formula = settings.formula.formula;
        this.variables = settings.formula.variables;

        this.fieldsStore = {};
        this.expressionLanguage = new ExpressionLanguage();

        this.initCalculations();
    }

    initCalculations() {
        // For every dynamic field defined in the formula, listen to changes and re-calculate
        Object.keys(this.variables).forEach((variableKey) => {
            const variable = this.variables[variableKey];

            const $target = this.$form.querySelector('[name="' + variable.name + '"]');

            if (!$target) {
                return;
            }

            const eventType = this.getEventType($target);

            // Watch for changes on the target field. When one occurs, fire off a custom event on the source field
            this.form.addEventListener($target, eventKey(eventType), () => this.$field.dispatchEvent(new Event('FormieEvaluateCalculations', { bubbles: true })));
                    
            // Save the resolved target for later
            this.fieldsStore[variableKey] = {
                $target,
                ...variable,
            };
        });

        // Add a custom event listener to fire when the field event listener fires
        this.form.addEventListener(this.$field, eventKey('FormieEvaluateCalculations'), this.evaluateCalculations.bind(this));

        // Also - trigger the event right now to evaluate immediately. Namely if we need to hide
        // field that are set to show if conditions are met.
        this.$field.dispatchEvent(new Event('FormieEvaluateCalculations', { bubbles: true }));
    }

    evaluateCalculations(e) {
        const variables = {};

        // For each variable, grab the value
        Object.keys(this.fieldsStore).forEach((variableKey) => {
            const { $target, type } = this.fieldsStore[variableKey];

            let { value } = $target;

            // Handle some fields differently and check for type-casting
            if (type === 'verbb\\formie\\fields\\formfields\\Number') {
                value = Number($target.value);
            }

            variables[variableKey] = value;
        });

        try {
            let result = this.expressionLanguage.evaluate(this.formula, variables);

            // Handle null-like results. If they're `NaN`, `false` set as empty, but `0` is valid
            if (typeof result === 'undefined' || Number.isNaN(result)) {
                result = '';
            }

            this.$input.value = result;
        } catch (ex) {
            console.error(ex);

            // Always reset in the event of an error
            this.$input.value = '';
        }
    }

    getEventType($field) {
        const tagName = $field.tagName.toLowerCase();
        const inputType = $field.getAttribute('type') ? $field.getAttribute('type').toLowerCase() : '';

        if (tagName === 'select' || inputType === 'date') {
            return 'change';
        }

        if (inputType === 'number') {
            return 'input';
        }

        if (inputType === 'checkbox' || inputType === 'radio') {
            return 'click';
        }

        return 'keyup';
    }
}

window.FormieCalculations = FormieCalculations;
