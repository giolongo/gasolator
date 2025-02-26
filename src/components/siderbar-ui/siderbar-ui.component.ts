import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {MatButton} from '@angular/material/button';
import { InputUiComponent } from "../input-ui/input-ui.component";

@Component({
  selector: 'app-siderbar-ui',
  imports: [MatSidenavModule, CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButton, InputUiComponent],
  templateUrl: './siderbar-ui.component.html',
  styleUrl: './siderbar-ui.component.scss'
})
export class SiderbarUiComponent {

  public formSignal = input<FormGroup>();
  public fromFormControlName = input<string>();
  public toFormControlName = input<string>();

  protected exceuteCalculate = output<any>();

  onSubmit(): void {
    const formValue = this.formSignal()?.value;
    this.exceuteCalculate.emit(formValue);
  }
}
