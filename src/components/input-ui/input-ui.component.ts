import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-input-ui',
  imports: [MatFormFieldModule, CommonModule, ReactiveFormsModule, MatInputModule],
  templateUrl: './input-ui.component.html',
  styleUrl: './input-ui.component.scss'
})
export class InputUiComponent {

    public formSignal = input<FormGroup>();
    public controlName = input<string>();
    public label = input<string>();
    public type = input<string>();
}
