import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-common-info-card',
  templateUrl: './common-info-card.component.html',
  styleUrls: ['./common-info-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommonInfoCardComponent {
  @Input() contentLoading: boolean | null = true;
  @Input() title?: string;
}
