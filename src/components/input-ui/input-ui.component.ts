import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, ViewChild } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { NominationSuggestModel } from '../../models/nomination-suggest.model';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-input-ui',
  imports: [MatFormFieldModule, CommonModule, ReactiveFormsModule, MatInputModule, MatIconModule,
    MatAutocompleteModule],
  templateUrl: './input-ui.component.html',
  styleUrl: './input-ui.component.scss'
})
export class InputUiComponent {

  @ViewChild(MatAutocomplete, { static: false }) auto!: MatAutocomplete;

  public formSignal = input<FormGroup>();
  public formArrayNameSignal = input<string>();
  public controlName = input<string | number | null>();
  public label = input<string>();
  public type = input<string>();
  public isAutocomplete = input<boolean>();
  public suggest = input<NominationSuggestModel[]>();
  
  public deleteElement = output<void>();

  getOptionText(option: NominationSuggestModel) {
    return option.display_name;
  }
}
