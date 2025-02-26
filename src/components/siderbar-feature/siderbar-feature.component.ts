import { Component, effect, inject, input, OnInit, output } from '@angular/core';
import { SiderbarUiComponent } from "../siderbar-ui/siderbar-ui.component";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-siderbar-feature',
  imports: [SiderbarUiComponent],
  templateUrl: './siderbar-feature.component.html',
  styleUrl: './siderbar-feature.component.scss'
})
export class SiderbarFeatureComponent implements OnInit{
  private fb = inject(FormBuilder);

  public fromFormName = 'from';
  public toFormName = 'to';
  public gasolatorForm?: FormGroup;

  ngOnInit(): void {
    this.gasolatorForm = this.fb.group({
      [this.fromFormName]: ['', Validators.required],
      [this.toFormName]: ['', Validators.required]
    });
  }
}
