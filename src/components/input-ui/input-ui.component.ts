import { CommonModule } from '@angular/common';
import { Component, input, output, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
  selector: 'app-input-ui',
  imports: [MatFormFieldModule, CommonModule, ReactiveFormsModule, MatInputModule,
    MatAutocompleteModule],
  templateUrl: './input-ui.component.html',
  styleUrl: './input-ui.component.scss'
})
export class InputUiComponent {

  @ViewChild(MatAutocomplete, { static: false }) auto!: MatAutocomplete;

  public formSignal = input<FormGroup>();
  public controlName = input<string>();
  public label = input<string>();
  public type = input<string>();
  public isAutocomplete = input<boolean>();
  public suggest = input<any[]>();

  getOptionText(option: any) {
    return option.display_name;
  }
}
