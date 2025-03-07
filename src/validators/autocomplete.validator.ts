import { AbstractControl, ValidationErrors } from '@angular/forms';

export function autocompleteValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;

        if (!value) {
            return { required: true }; // ❌ Campo vuoto → Errore
        }

        if (typeof value !== 'object' || !('lat' in value) || !('lon' in value)) {
            return { invalidSelection: true }; // ❌ Non è un'opzione valida → Errore
        }

        return null; // ✅ Valido
    };
}
